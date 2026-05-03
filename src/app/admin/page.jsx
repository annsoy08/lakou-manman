"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getReportedPosts,
  getReports,
  getAllUsers,
  getOpenUserReports,
  getModerationLogs,
  getDoctorProfiles,
  assignDoctorProfileToUser,
  ensureDoctorStarterProfiles,
  hidePost,
  unhidePost,
  resolveReport,
  resolveUserReport,
  moderateUserProfile,
  getPosts,
  updatePostsWithAuthorPhotos,
  getAllShopItems,
  getShopOrders,
  updateShopOrder,
  markItemSold,
  updateUserProfile,
} from "@/lib/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import {
  ShieldCheck,
  AlertTriangle,
  Users,
  FileText,
  Eye,
  EyeOff,
  CheckCircle2,
  MessageCircle,
  RefreshCw,
  ShoppingBag,
  LayoutGrid,
  CalendarHeart,
  Trophy,
} from "lucide-react";

const ADMIN_ACCESS_TIMEOUT_MS = 12000;
const ADMIN_BOOTSTRAP_TIMEOUT_MS = 15000;

function createAdminTimeoutError(code = "admin_timeout") {
  const error = new Error(code);
  error.code = code;
  return error;
}

function withAdminTimeout(promise, timeoutMs, timeoutCode) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(createAdminTimeoutError(timeoutCode));
    }, timeoutMs);

    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading, refreshProfile } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [reportedPosts, setReportedPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [doctorProfiles, setDoctorProfiles] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [shopItems, setShopItems] = useState([]);
  const [shopOrders, setShopOrders] = useState([]);
  const [userReports, setUserReports] = useState([]);
  const [moderationLogs, setModerationLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [updatingPhotos, setUpdatingPhotos] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [resolutionDraft, setResolutionDraft] = useState({ kind: "", reportId: "", resolution: "reviewed", note: "" });
  const [doctorProfileAssignments, setDoctorProfileAssignments] = useState({});
  const [doctorProfileFeedback, setDoctorProfileFeedback] = useState({ tone: "success", message: "" });
  const [roleFeedback, setRoleFeedback] = useState({ tone: "success", message: "" });
  const [adminSection, setAdminSection] = useState("finances");
  const [activeAdminTab, setActiveAdminTab] = useState("shopOrders");
  const shopProductsLabel = language === "ht" ? "Pwodwi boutik" : "Produits boutique";
  const shopOrdersLabel = language === "ht" ? "Kòmand boutik" : "Commandes boutique";
  const availableLabel = language === "ht" ? "Disponib" : "Disponible";
  const soldLabel = language === "ht" ? "Vann" : "Vendu";
  const pendingLabel = language === "ht" ? "An atant" : "En attente";
  const completedLabel = language === "ht" ? "Konfime" : "Confirmée";
  const pickupLabel = language === "ht" ? "Retrè" : "Retrait";
  const deliveryLabel = language === "ht" ? "Livrezon" : "Livraison";
  const totalSalesLabel = language === "ht" ? "Vant total" : "Ventes totales";
  const totalCommissionLabel = language === "ht" ? "Komisyon 10 %" : "Commission 10 %";
  const totalSellerLabel = language === "ht" ? "Net vandè" : "Net vendeur";
  const affiliateShopLabel = language === "ht" ? "Magazen afilye" : "Magasin affilié";
  const communitySellerLabel = language === "ht" ? "Manm kominote" : "Membre communauté";
  const shopNameLabel = language === "ht" ? "Boutik" : "Boutique";
  const noShopItemsLabel = language === "ht" ? "Pa gen pwodwi boutik." : "Aucun produit boutique.";
  const noShopOrdersLabel = language === "ht" ? "Pa gen kòmand boutik." : "Aucune commande boutique.";
  const supportPhoneLabel = "+509 32 58 93 91";
  const supportPhoneHref = "50932589391";
  const monitoringLabel = language === "ht" ? "Siveyans" : "Suivi";
  const actionRequiredLabel = language === "ht" ? "Aksyon nesesè" : "Action requise";
  const refundedLabel = language === "ht" ? "Rembouse" : "Remboursée";
  const resolvedSupportLabel = language === "ht" ? "Rezoud" : "Résolue";
  const userReportsLabel = language === "ht" ? "Rapò itilizatè" : "Signalements utilisateurs";
  const userReportsOpenLabel = language === "ht" ? "Rapò itilizatè ouvè" : "Signalements utilisateurs ouverts";
  const moderationLogsLabel = language === "ht" ? "Jounal modération" : "Journal de modération";
  const moderatedProfilesLabel = language === "ht" ? "Pwofil modere" : "Profils modérés";
  const activeUserLabel = language === "ht" ? "Aktif" : "Actif";
  const underReviewUserLabel = language === "ht" ? "An revizyon" : "Sous revue";
  const restrictedUserLabel = language === "ht" ? "Restrenn" : "Restreint";
  const suspendedUserLabel = language === "ht" ? "Sispann" : "Suspendu";
  const messagesRestrictedLabel = language === "ht" ? "Mesaj limite" : "Messages limités";
  const profileHiddenLabel = language === "ht" ? "Pwofil kache" : "Profil masqué";
  const enableMessagesLabel = language === "ht" ? "Otorize mesaj" : "Autoriser messages";
  const restrictMessagesLabel = language === "ht" ? "Limite mesaj" : "Limiter messages";
  const hideProfileLabel = language === "ht" ? "Kache pwofil" : "Masquer profil";
  const showProfileLabel = language === "ht" ? "Reparèt pwofil" : "Réafficher profil";
  const suspendUserLabel = language === "ht" ? "Sispann" : "Suspendre";
  const reactivateUserLabel = language === "ht" ? "Reaktive" : "Réactiver";
  const reviewUserLabel = language === "ht" ? "Mete sou revizyon" : "Mettre sous revue";
  const resolveLabel = language === "ht" ? "Rezoud" : "Résoudre";
  const closeResolutionLabel = language === "ht" ? "Fèmen" : "Fermer";
  const resolutionPanelLabel = language === "ht" ? "Rezolisyon signalman" : "Résolution du signalement";
  const resolutionTypeLabel = language === "ht" ? "Kalite rezolisyon" : "Type de résolution";
  const resolutionNoteLabel = language === "ht" ? "Nòt admin" : "Note admin";
  const resolutionNotePlaceholder = language === "ht"
    ? "Ajoute yon nòt entèn sou desizyon an..."
    : "Ajoutez une note interne sur la décision...";
  const saveResolutionLabel = language === "ht" ? "Valide rezolisyon an" : "Valider la résolution";
  const reviewedResolutionLabel = language === "ht" ? "Revize san lòt aksyon" : "Examiné sans autre action";
  const contentRemovedResolutionLabel = language === "ht" ? "Kontni retire" : "Contenu retiré";
  const warningSentResolutionLabel = language === "ht" ? "Avètisman voye" : "Avertissement envoyé";
  const restrictedResolutionLabel = language === "ht" ? "Kont restrenn" : "Compte restreint";
  const suspendedResolutionLabel = language === "ht" ? "Kont sispann" : "Compte suspendu";
  const falsePositiveResolutionLabel = language === "ht" ? "Fo alèt / san vyolasyon" : "Faux signalement / aucune violation";
  const noUserReportsLabel = language === "ht" ? "Pa gen rapò itilizatè ouvè." : "Aucun signalement utilisateur ouvert.";
  const noModerationLogsLabel = language === "ht" ? "Pa gen aksyon modération pou kounye a." : "Aucune action de modération pour le moment.";
  const doctorEditorLabel = language === "ht" ? "Editè medsen" : "Doctor editor";
  const grantDoctorEditorLabel = language === "ht" ? "Bay aksè medsen" : "Donner accès médecin";
  const removeDoctorEditorLabel = language === "ht" ? "Retire aksè medsen" : "Retirer accès médecin";
  const doctorRoleLabel = language === "ht" ? "Medsen" : "Médecin";
  const grantDoctorRoleLabel = language === "ht" ? "Bay wòl medsen" : "Rôle médecin";
  const removeDoctorRoleLabel = language === "ht" ? "Retire wòl medsen" : "Retirer rôle médecin";
  const doctorProfilesLabel = language === "ht" ? "Pwofil medsen" : "Profils médecins";
  const noDoctorProfilesLabel = language === "ht" ? "Pa gen pwofil medsen pou kounye a." : "Aucun profil médecin pour le moment.";
  const linkDoctorProfileLabel = language === "ht" ? "Lye pwofil la" : "Lier le profil";
  const doctorTargetLabel = language === "ht" ? "Kont pou lye a" : "Compte à lier";
  const doctorTargetPlaceholder = language === "ht" ? "Chwazi yon kont" : "Choisir un compte";
  const linkedAccountLabel = language === "ht" ? "Kont lye" : "Compte lié";
  const unlinkedAccountLabel = language === "ht" ? "Poko lye" : "Non lié";
  const doctorProfileLinkedLabel = language === "ht" ? "Pwofil la lye avèk siksè." : "Le profil a bien été lié.";
  const doctorProfileLinkConflictLabel = language === "ht" ? "Kont sa a deja gen yon lòt pwofil medsen lye." : "Ce compte a déjà un autre profil médecin lié.";
  const doctorProfileLinkMissingTargetLabel = language === "ht" ? "Chwazi yon kont avan ou lye pwofil la." : "Choisissez un compte avant de lier le profil.";
  const reassignedArticlesLabel = language === "ht" ? "Atik relie" : "Articles reliés";
  const financesSectionLabel = language === "ht" ? "Finans" : "Finances";
  const rightsSectionLabel = language === "ht" ? "Dwa ak aksè" : "Utilisateurs et droits";
  const applicationSectionLabel = language === "ht" ? "Aplikasyon" : "Application et contenu";
  const financesSectionDescription = language === "ht"
    ? "Swiv pwodwi, kòmand, pèman ak komisyon boutique la."
    : "Suivez les produits, les commandes, les paiements et les commissions de la boutique.";
  const rightsSectionDescription = language === "ht"
    ? "Jere dwa itilizatè yo, aksè pwofesyonèl yo ak aksyon modération yo."
    : "Gérez les comptes, les accès professionnels, les restrictions et les actions de modération.";
  const applicationSectionDescription = language === "ht"
    ? "Siveye sa k ap pase nan aplikasyon an: kontni, siyalman ak antretyen."
    : "Surveillez les contenus publiés, les signalements et l'activité générale de l'application.";
  const adminSectionsLabel = language === "ht" ? "Gwo kategori admin" : "Grandes catégories admin";
  const adminSubsectionsLabel = language === "ht" ? "Zouti nan seksyon an" : "Outils de cette section";
  const adminSubsectionsDescription = language === "ht"
    ? "Chwazi youn nan zouti sa yo pou kontinye jere seksyon an."
    : "Choisissez un outil ci-dessous pour travailler dans cette section.";
  const adminAccessErrorLabel = language === "ht"
    ? "Nou pa t ka verifye aksè admin lan kounye a."
    : "La vérification de l'accès admin a échoué pour le moment.";
  const adminAccessTimeoutLabel = language === "ht"
    ? "Verifikasyon aksè admin lan pran twòp tan. Verifye koneksyon an epi eseye ankò."
    : "La vérification de l'accès admin a dépassé le délai prévu. Vérifiez la connexion puis réessayez.";
  const adminLoadErrorLabel = language === "ht"
    ? "Nou pa t ka chaje done admin yo kounye a."
    : "Les données admin n'ont pas pu être chargées pour le moment.";
  const adminLoadTimeoutLabel = language === "ht"
    ? "Chajman done admin yo pran twòp tan. Verifye koneksyon an epi eseye ankò."
    : "Le chargement des données admin a dépassé le délai prévu. Vérifiez la connexion puis réessayez.";
  const effectiveIsAdmin = Boolean(isAdmin || accessGranted);
  const formatMoney = (value) => `${Number(value || 0).toFixed(2)} HTG`;
  const normalizeUserStatus = (value = "") => String(value || "").trim().toLowerCase() || "active";
  const getUserStatusMeta = (profile = {}) => {
    const status = normalizeUserStatus(profile?.moderationStatus);

    if (["suspended", "banned", "disabled"].includes(status)) {
      return { key: "suspended", label: suspendedUserLabel, className: "bg-rose-100 text-rose-700" };
    }

    if (["restricted", "limited", "warning"].includes(status)) {
      return { key: "restricted", label: restrictedUserLabel, className: "bg-amber-100 text-amber-800" };
    }

    if (["review", "under_review", "pending_review"].includes(status)) {
      return { key: "under_review", label: underReviewUserLabel, className: "bg-violet-100 text-violet-700" };
    }

    return { key: "active", label: activeUserLabel, className: "bg-emerald-100 text-emerald-700" };
  };
  const formatModerationActionLabel = (value = "") => {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return "-";
    }

    return normalized.replaceAll("_", " ");
  };
  const normalizeOrderStatus = (value = "") => {
    const normalized = String(value || "").trim().toLowerCase();
    if (["completed", "paid", "success", "succeeded"].includes(normalized)) return "completed";
    if (["failed", "failure", "error", "declined"].includes(normalized)) return "failed";
    if (["refunded", "refund"].includes(normalized)) return "refunded";
    if (["cancelled", "canceled"].includes(normalized)) return "cancelled";
    if (["pending", "processing", "initiated"].includes(normalized)) return "pending";
    return normalized || "pending";
  };
  const getResolvedOrderStatus = (order) => normalizeOrderStatus(order?.paymentStatus || order?.status || "pending");
  const getResolvedSupportStatus = (order) => {
    const explicit = String(order?.supportStatus || "").trim().toLowerCase();
    if (explicit) {
      return explicit;
    }

    const orderStatus = getResolvedOrderStatus(order);
    if (orderStatus === "completed") return "resolved";
    if (orderStatus === "refunded") return "refunded";
    if (["failed", "cancelled"].includes(orderStatus)) return "action_required";
    if (orderStatus === "pending" && (order?.realMonCash || order?.paymentMethod === "natcash")) return "monitoring";
    return "none";
  };
  const getOrderStatusMeta = (order) => {
    const status = getResolvedOrderStatus(order);

    if (status === "completed") {
      return { key: status, label: completedLabel, className: "bg-emerald-100 text-emerald-700" };
    }

    if (status === "refunded") {
      return { key: status, label: refundedLabel, className: "bg-slate-200 text-slate-700" };
    }

    if (["failed", "cancelled"].includes(status)) {
      return {
        key: status,
        label: language === "ht" ? "Echwe" : "Échouée",
        className: "bg-rose-100 text-rose-700",
      };
    }

    return { key: status, label: pendingLabel, className: "bg-amber-100 text-amber-700" };
  };
  const getSupportStatusMeta = (order) => {
    const supportStatus = getResolvedSupportStatus(order);

    if (supportStatus === "resolved") {
      return { key: supportStatus, label: resolvedSupportLabel, className: "bg-emerald-100 text-emerald-700" };
    }

    if (supportStatus === "refunded") {
      return { key: supportStatus, label: refundedLabel, className: "bg-slate-200 text-slate-700" };
    }

    if (supportStatus === "action_required") {
      return { key: supportStatus, label: actionRequiredLabel, className: "bg-rose-100 text-rose-700" };
    }

    if (supportStatus === "monitoring") {
      return { key: supportStatus, label: monitoringLabel, className: "bg-amber-100 text-amber-700" };
    }

    return { key: supportStatus, label: "", className: "" };
  };
  const availableShopItemsCount = shopItems.filter((item) => item.status !== "sold").length;
  const soldShopItemsCount = shopItems.filter((item) => item.status === "sold").length;
  const settledShopOrders = shopOrders.filter(
    (order) => getResolvedOrderStatus(order) === "completed"
  );
  const completedShopOrdersCount = settledShopOrders.length;
  const monitoringShopOrdersCount = shopOrders.filter((order) => getResolvedSupportStatus(order) === "monitoring").length;
  const shopOrdersNeedingAttentionCount = shopOrders.filter(
    (order) => getResolvedSupportStatus(order) === "action_required"
  ).length;
  const refundedShopOrdersCount = shopOrders.filter((order) => getResolvedOrderStatus(order) === "refunded").length;
  const totalSales = settledShopOrders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
  const totalCommission = settledShopOrders.reduce((sum, order) => sum + (Number(order.commissionAmount) || 0), 0);
  const totalSellerAmount = settledShopOrders.reduce((sum, order) => sum + (Number(order.sellerAmount) || 0), 0);
  const usersById = new Map(users.map((record) => [record.id, record]));
  const usersByEmail = new Map(
    users
      .filter((record) => String(record.email || "").trim())
      .map((record) => [String(record.email || "").trim().toLowerCase(), record])
  );
  const doctorAssignableUsers = users.filter((record) => String(record.role || "").trim().toLowerCase() !== "admin");
  const userReportCountByUserId = userReports.reduce((accumulator, report) => {
    const reportTargetId = report?.reportedUserId;
    if (reportTargetId) {
      accumulator[reportTargetId] = (accumulator[reportTargetId] || 0) + 1;
    }
    return accumulator;
  }, {});
  const moderatedUsersCount = users.filter((record) => {
    const status = normalizeUserStatus(record?.moderationStatus);
    return status !== "active" || record?.messagingRestricted || record?.profileHidden;
  }).length;
  const adminSectionOptions = [
    {
      key: "finances",
      label: financesSectionLabel,
      icon: ShoppingBag,
      description: financesSectionDescription,
      defaultTab: "shopOrders",
      tabsGridClass: "md:grid-cols-2",
      pill: `${shopOrders.length} ${shopOrdersLabel}`,
      overview: [
        { value: formatMoney(totalSales), label: totalSalesLabel, className: "bg-indigo-50" },
        { value: formatMoney(totalCommission), label: totalCommissionLabel, className: "bg-violet-50" },
        { value: formatMoney(totalSellerAmount), label: totalSellerLabel, className: "bg-cyan-50" },
        { value: monitoringShopOrdersCount, label: monitoringLabel, className: "bg-amber-50" },
      ],
    },
    {
      key: "rights",
      label: rightsSectionLabel,
      icon: ShieldCheck,
      description: rightsSectionDescription,
      defaultTab: "users",
      tabsGridClass: "md:grid-cols-4",
      pill: `${users.length} ${t("users")}`,
      overview: [
        { value: users.length, label: t("users"), className: "bg-sky-50" },
        { value: userReports.length, label: userReportsOpenLabel, className: "bg-fuchsia-50" },
        { value: moderatedUsersCount, label: moderatedProfilesLabel, className: "bg-slate-100" },
        { value: doctorProfiles.length, label: doctorProfilesLabel, className: "bg-emerald-50" },
      ],
    },
    {
      key: "application",
      label: applicationSectionLabel,
      icon: LayoutGrid,
      description: applicationSectionDescription,
      defaultTab: "reported",
      tabsGridClass: "md:grid-cols-3",
      pill: `${reportedPosts.length + reports.length} ${language === "ht" ? "alèt" : "alertes"}`,
      overview: [
        { value: reportedPosts.length, label: t("reportedPosts"), className: "bg-rose-50" },
        { value: reports.length, label: t("openReports"), className: "bg-pink-50" },
        { value: allPosts.length, label: t("totalPosts"), className: "bg-emerald-50" },
        { value: shopItems.length, label: shopProductsLabel, className: "bg-orange-50" },
      ],
    },
  ];
  const activeAdminSectionMeta = adminSectionOptions.find((section) => section.key === adminSection) || adminSectionOptions[0];
  const adminTabOptions = [
    { value: "reported", section: "application", label: t("reportedPosts"), icon: AlertTriangle },
    { value: "reports", section: "application", label: t("reports"), icon: FileText },
    { value: "posts", section: "application", label: t("allPosts"), icon: MessageCircle },
    { value: "users", section: "rights", label: t("users"), icon: Users },
    { value: "userReports", section: "rights", label: userReportsLabel, icon: FileText },
    { value: "doctorProfiles", section: "rights", label: doctorProfilesLabel, icon: FileText },
    { value: "moderationLogs", section: "rights", label: moderationLogsLabel, icon: ShieldCheck },
    { value: "shopProducts", section: "finances", label: shopProductsLabel, icon: ShoppingBag },
    { value: "shopOrders", section: "finances", label: shopOrdersLabel, icon: ShoppingBag },
  ];
  const activeAdminTabs = adminTabOptions.filter((tab) => tab.section === adminSection);

  function handleAdminSectionChange(nextSection) {
    const nextSectionMeta = adminSectionOptions.find((section) => section.key === nextSection);
    setAdminSection(nextSection);
    setActiveAdminTab(nextSectionMeta?.defaultTab || "reported");
  }

  const postResolutionOptions = [
    { value: "reviewed", label: reviewedResolutionLabel },
    { value: "content_removed", label: contentRemovedResolutionLabel },
    { value: "warning_sent", label: warningSentResolutionLabel },
    { value: "false_positive", label: falsePositiveResolutionLabel },
  ];
  const userResolutionOptions = [
    { value: "reviewed", label: reviewedResolutionLabel },
    { value: "warning_sent", label: warningSentResolutionLabel },
    { value: "restricted", label: restrictedResolutionLabel },
    { value: "suspended", label: suspendedResolutionLabel },
    { value: "false_positive", label: falsePositiveResolutionLabel },
  ];

  async function refreshAdminData() {
    setLoading(true);
    setLoadError("");
    try {
      const {
        rUsers,
        rPosts,
        rReports,
        rDoctorProfiles,
        rAllPosts,
        rShopItems,
        rShopOrders,
        rUserReports,
        rModerationLogs,
      } = await withAdminTimeout(
        (async () => {
          const initialUsers = await getAllUsers();
          await ensureDoctorStarterProfiles(initialUsers);
          const nextUsers = await getAllUsers();
          const [nextPosts, nextReports, nextDoctorProfiles, nextAllPosts, nextShopItems, nextShopOrders, nextUserReports, nextModerationLogs] = await Promise.all([
            getReportedPosts(),
            getReports(),
            getDoctorProfiles(),
            getPosts({ limitCount: 50 }),
            getAllShopItems(),
            getShopOrders(),
            getOpenUserReports(),
            getModerationLogs(),
          ]);

          return {
            rUsers: nextUsers,
            rPosts: nextPosts,
            rReports: nextReports,
            rDoctorProfiles: nextDoctorProfiles,
            rAllPosts: nextAllPosts,
            rShopItems: nextShopItems,
            rShopOrders: nextShopOrders,
            rUserReports: nextUserReports,
            rModerationLogs: nextModerationLogs,
          };
        })(),
        ADMIN_BOOTSTRAP_TIMEOUT_MS,
        "admin_bootstrap_timeout"
      );
      setReportedPosts(rPosts);
      setReports(rReports);
      setUsers(rUsers);
      setDoctorProfiles(rDoctorProfiles);
      setAllPosts(rAllPosts);
      setShopItems(rShopItems);
      setShopOrders(rShopOrders);
      setUserReports(rUserReports);
      setModerationLogs(rModerationLogs);
      setDoctorProfileAssignments((prev) => {
        const nextAssignments = {};
        const usersByEmailMap = new Map(
          rUsers
            .filter((record) => String(record.email || "").trim())
            .map((record) => [String(record.email || "").trim().toLowerCase(), record])
        );

        rDoctorProfiles.forEach((profile) => {
          const currentLinkedUserId = String(profile.editorUserId || "").trim();
          const currentSelectedUserId = String(prev[profile.id] || "").trim();
          const matchedByEmail = usersByEmailMap.get(String(profile.email || "").trim().toLowerCase());
          nextAssignments[profile.id] = currentSelectedUserId || currentLinkedUserId || matchedByEmail?.id || "";
        });

        return nextAssignments;
      });
    } catch (err) {
      console.error("Admin load error:", err);
      setLoadError(err?.code === "admin_bootstrap_timeout" ? adminLoadTimeoutLabel : adminLoadErrorLabel);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function verifyAdminAccess() {
      if (authLoading) {
        return;
      }

      setAccessError("");
      if (!user) {
        if (!cancelled) {
          setAccessGranted(false);
          setLoading(false);
          setCheckingAccess(false);
        }
        router.replace("/");
        return;
      }

      if (isAdmin) {
        if (!cancelled) {
          setAccessGranted(true);
          setCheckingAccess(false);
        }
        return;
      }

      try {
        const refreshedProfile = await withAdminTimeout(
          refreshProfile(),
          ADMIN_ACCESS_TIMEOUT_MS,
          "admin_access_timeout"
        );

        if (cancelled) {
          return;
        }

        if (refreshedProfile?.role === "admin") {
          setAccessGranted(true);
          setCheckingAccess(false);
          return;
        }

        setAccessGranted(false);
        setLoading(false);
        setCheckingAccess(false);
        router.replace("/");
      } catch (error) {
        console.error("Admin access verification error:", error);

        if (cancelled) {
          return;
        }

        setAccessGranted(false);
        setLoading(false);
        setAccessError(error?.code === "admin_access_timeout" ? adminAccessTimeoutLabel : adminAccessErrorLabel);
        setCheckingAccess(false);
      }
    }

    setCheckingAccess(true);
    verifyAdminAccess();

    return () => {
      cancelled = true;
    };
  }, [adminAccessErrorLabel, adminAccessTimeoutLabel, authLoading, isAdmin, refreshProfile, router, user]);

  useEffect(() => {
    if (checkingAccess || !effectiveIsAdmin) return;
    refreshAdminData();
  }, [checkingAccess, effectiveIsAdmin]);

  async function handleHidePost(postId) {
    setActionLoading(postId);
    try {
      await hidePost(postId);
      setReportedPosts((prev) => prev.filter((p) => p.id !== postId));
      setAllPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, hidden: true } : p)));
    } catch (err) {
      console.error("Hide error:", err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleDoctorEditorRole(targetUser) {
    if (!targetUser?.id || targetUser.id === user?.uid || String(targetUser.role || "").trim().toLowerCase() === "admin") {
      return;
    }

    const nextRole = String(targetUser.role || "").trim().toLowerCase() === "doctor_editor"
      ? "user"
      : "doctor_editor";
    const actionKey = `user:${targetUser.id}:role`;
    setActionLoading(actionKey);

    try {
      await updateUserProfile(targetUser.id, { role: nextRole });
      await refreshAdminData();
    } catch (error) {
      console.error("Doctor editor role update error:", error);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleDoctorRole(targetUser) {
    if (!targetUser?.id || targetUser.id === user?.uid || String(targetUser.role || "").trim().toLowerCase() === "admin") {
      return;
    }

    const nextRole = String(targetUser.role || "").trim().toLowerCase() === "doctor"
      ? "user"
      : "doctor";
    const actionKey = `user:${targetUser.id}:doctor-role`;
    setActionLoading(actionKey);
    setRoleFeedback({ tone: "success", message: "" });

    try {
      await updateUserProfile(targetUser.id, { role: nextRole });
      await refreshAdminData();
      const label = language === "ht" ? "W\u00f2l medsen mete aj\u00f2." : `R\u00f4le m\u00e9decin ${nextRole === "doctor" ? "attribu\u00e9" : "retir\u00e9"} avec succ\u00e8s.`;
      setRoleFeedback({ tone: "success", message: label });
    } catch (error) {
      console.error("Doctor role update error:", error);
      setRoleFeedback({ tone: "error", message: String(error?.message || "Erreur lors de la mise \u00e0 jour du r\u00f4le.") });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAssignDoctorProfile(profile) {
    const targetUserId = String(doctorProfileAssignments[profile?.id] || "").trim();

    if (!profile?.id || !targetUserId) {
      setDoctorProfileFeedback({ tone: "error", message: doctorProfileLinkMissingTargetLabel });
      return;
    }

    const targetUser = usersById.get(targetUserId);
    if (!targetUser) {
      setDoctorProfileFeedback({ tone: "error", message: doctorProfileLinkMissingTargetLabel });
      return;
    }

    const actionKey = `doctor-profile:${profile.id}:assign`;
    setActionLoading(actionKey);
    setDoctorProfileFeedback({ tone: "success", message: "" });

    try {
      const result = await assignDoctorProfileToUser(profile.id, targetUser);

      if (!["doctor_editor", "admin"].includes(String(targetUser.role || "").trim().toLowerCase())) {
        await updateUserProfile(targetUser.id, { role: "doctor_editor" });
      }

      await refreshAdminData();
      setDoctorProfileFeedback({
        tone: "success",
        message: `${doctorProfileLinkedLabel} ${reassignedArticlesLabel}: ${result.reassignedArticleCount}.`,
      });
    } catch (error) {
      console.error("Doctor profile assign error:", error);
      setDoctorProfileFeedback({
        tone: "error",
        message: String(error?.message || "") === "doctor_profile_target_already_linked"
          ? doctorProfileLinkConflictLabel
          : String(error?.message || "assign_error"),
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResolveUserReport(reportId) {
    const actionKey = `user-report:${reportId}`;
    setActionLoading(actionKey);
    try {
      await resolveUserReport(reportId, {
        resolverId: user?.uid || "",
        resolution: resolutionDraft.resolution || "reviewed",
        note: resolutionDraft.note || "",
      });
      await refreshAdminData();
      setResolutionDraft({ kind: "", reportId: "", resolution: "reviewed", note: "" });
    } catch (err) {
      console.error("Resolve user report error:", err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleModerateUser(targetUser, nextData, actionSuffix = "moderate") {
    if (!targetUser?.id) {
      return;
    }

    if (targetUser.id === user?.uid || String(targetUser.role || "").trim().toLowerCase() === "admin") {
      return;
    }

    const actionKey = `user:${targetUser.id}:${actionSuffix}`;
    setActionLoading(actionKey);
    try {
      await moderateUserProfile(targetUser.id, nextData, user?.uid || "");
      await refreshAdminData();
    } catch (err) {
      console.error("User moderation error:", err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUnhidePost(postId) {
    setActionLoading(postId);
    try {
      await unhidePost(postId);
      setAllPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, hidden: false, reported: false } : p)));
    } catch (err) {
      console.error("Unhide error:", err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResolveReport(reportId) {
    const actionKey = `report:${reportId}`;
    setActionLoading(actionKey);
    try {
      await resolveReport(reportId, {
        resolverId: user?.uid || "",
        resolution: resolutionDraft.resolution || "reviewed",
        note: resolutionDraft.note || "",
      });
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setResolutionDraft({ kind: "", reportId: "", resolution: "reviewed", note: "" });
    } catch (err) {
      console.error("Resolve error:", err);
    } finally {
      setActionLoading(null);
    }
  }

  function openResolutionPanel(kind, reportId) {
    const options = kind === "user" ? userResolutionOptions : postResolutionOptions;
    setResolutionDraft({
      kind,
      reportId,
      resolution: options[0]?.value || "reviewed",
      note: "",
    });
  }

  function closeResolutionPanel() {
    setResolutionDraft({ kind: "", reportId: "", resolution: "reviewed", note: "" });
  }

  function updateResolutionDraft(field, value) {
    setResolutionDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function handleUpdatePhotos() {
    setUpdatingPhotos(true);
    try {
      await updatePostsWithAuthorPhotos();
      await refreshAdminData();
    } catch (err) {
      console.error("Update photos error:", err);
    } finally {
      setUpdatingPhotos(false);
    }
  }

  async function handleShopOrderUpdate(order, nextData) {
    const actionKey = `order:${order.id}`;
    setActionLoading(actionKey);
    try {
      await updateShopOrder(order.id, {
        ...nextData,
        realMonCash: order.realMonCash,
      });

      const nextStatus = normalizeOrderStatus(nextData.status || nextData.paymentStatus || "");
      if (nextStatus === "completed" && order.itemId) {
        await markItemSold(order.itemId);
      }

      await refreshAdminData();
    } catch (err) {
      console.error("Shop order update error:", err);
    } finally {
      setActionLoading(null);
    }
  }

  if (authLoading || checkingAccess || (effectiveIsAdmin && loading)) {
    return <div className="py-12 text-center text-slate-500">{t("loadingAdminPanel")}</div>;
  }

  if (!effectiveIsAdmin) {
    if (!accessError) {
      return null;
    }

    return (
      <div className="py-12">
        <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
          {accessError}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loadError}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <a href="/admin/evenements-bookings"
          className="flex flex-1 items-center justify-between gap-4 rounded-[2rem] border border-fuchsia-200 bg-gradient-to-r from-rose-50 to-fuchsia-50 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-500">
              <CalendarHeart className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-rose-900">Demandes événementielles</p>
              <p className="text-sm text-slate-500">Voir, répondre et gérer toutes les demandes de devis</p>
            </div>
          </div>
          <span className="rounded-2xl bg-fuchsia-600 px-3 py-1 text-xs font-bold text-white">Ouvrir →</span>
        </a>
        <a href="/admin/event-partners"
          className="flex flex-1 items-center justify-between gap-4 rounded-[2rem] border border-rose-100 bg-gradient-to-r from-pink-50 to-rose-50 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500">
              <CalendarHeart className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-rose-900">Partenaires événements</p>
              <p className="text-sm text-slate-500">Ajouter, modifier ou désactiver les partenaires</p>
            </div>
          </div>
          <span className="rounded-2xl bg-rose-600 px-3 py-1 text-xs font-bold text-white">Gérer →</span>
        </a>
      </div>

      <a href="/admin/concours"
        className="flex items-center justify-between gap-4 rounded-[2rem] border border-amber-100 bg-gradient-to-r from-amber-50 to-rose-50 p-5 shadow-sm hover:shadow-md transition">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-extrabold text-rose-900">Concours</p>
            <p className="text-sm text-slate-500">Créer et gérer les concours en 3 phases</p>
          </div>
        </div>
        <span className="rounded-2xl bg-amber-500 px-3 py-1 text-xs font-bold text-white">Gérer →</span>
      </a>

      <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white/70 p-5 shadow-sm lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("adminPanel")}</h1>
            <p className="mt-1 text-slate-600">{t("adminPanelDesc")}</p>
          </div>
        </div>
        <Button
          onClick={handleUpdatePhotos}
          disabled={updatingPhotos}
          className="rounded-xl"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${updatingPhotos ? 'animate-spin' : ''}`} />
          {updatingPhotos ? "Mise à jour..." : "Mettre à jour les photos"}
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium uppercase tracking-wide text-slate-500">{adminSectionsLabel}</div>
          <p className="mt-1 text-sm text-slate-600">{t("adminPanelDesc")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
        {adminSectionOptions.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => handleAdminSectionChange(section.key)}
            className={`rounded-[2rem] border p-5 text-left transition-all ${
              adminSection === section.key
                ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`rounded-2xl p-2 ${adminSection === section.key ? "bg-white/15" : "bg-slate-100"}`}>
                  <section.icon className={`h-5 w-5 ${adminSection === section.key ? "text-white" : "text-slate-700"}`} />
                </div>
                <div className="text-lg font-semibold">{section.label}</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${adminSection === section.key ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}>
                {section.pill}
              </span>
            </div>
            <p className={`mt-2 text-sm ${adminSection === section.key ? "text-slate-200" : "text-slate-600"}`}>
              {section.description}
            </p>
          </button>
        ))}
        </div>
      </div>

      <Card className="rounded-[2rem] border-0 bg-slate-50 shadow-none">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-medium uppercase tracking-wide text-slate-500">{adminSubsectionsLabel}</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{activeAdminSectionMeta.label}</div>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">{activeAdminSectionMeta.description}</p>
              <p className="mt-2 text-xs text-slate-500">{adminSubsectionsDescription}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
              <span className="font-medium text-slate-900">{activeAdminSectionMeta.pill}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {activeAdminSectionMeta.overview.map((item) => (
              <div key={item.label} className={`rounded-2xl p-4 ${item.className}`}>
                <div className="text-2xl font-semibold text-slate-900">{item.value}</div>
                <div className="text-sm text-slate-600">{item.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeAdminTab} onValueChange={setActiveAdminTab} className="space-y-4">
        <TabsList className={`grid h-auto grid-cols-1 gap-2 rounded-2xl bg-white p-2 shadow-sm sm:grid-cols-2 ${activeAdminSectionMeta.tabsGridClass}`}>
          {activeAdminTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="rounded-xl">
                <Icon className="mr-2 h-4 w-4" /> {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Reported Posts */}
        <TabsContent value="reported" className="space-y-4">
          {reportedPosts.length === 0 ? (
            <Card className="rounded-[2rem]">
              <CardContent className="py-8 text-center text-slate-500">
                {t("noReportedPosts")}
              </CardContent>
            </Card>
          ) : (
            reportedPosts.map((post) => (
              <Card key={post.id} className="rounded-2xl border-red-100 bg-red-50/30">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{post.authorName || t("anonymous")}</span>
                        <Badge variant="destructive" className="rounded-full">{t("reported")}</Badge>
                        {post.createdAt && (
                          <span className="text-xs text-slate-400">{formatDate(post.createdAt)}</span>
                        )}
                      </div>
                      <h3 className="mt-2 font-semibold">{post.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{post.body}</p>
                      {post.tag && (
                        <Badge variant="secondary" className="mt-2 rounded-full">
                          {post.tag === 'tagFeeding' ? (language === 'fr' ? 'Alimentation' : 'Alimantasyon') :
                           post.tag === 'tagSleep' ? (language === 'fr' ? 'Sommeil bébé' : 'Dòmi tibebe') :
                           post.tag === 'tagPostpartum' ? 'Post-partum' :
                           post.tag === 'tagCreole' ? (language === 'fr' ? 'Mères dans la diaspora' : 'Manman nan diaspora') :
                           post.tag === 'tagWorkKids' ? (language === 'fr' ? 'Travail et enfants' : 'Travay ak timoun') :
                           post.tag === 'tagHealth' ? (language === 'fr' ? 'Santé' : 'Lasante') :
                           post.tag === 'tagEducation' ? (language === 'fr' ? 'Éducation' : 'Edikasyon') :
                           post.tag === 'tagCommunity' ? (language === 'fr' ? 'Communauté' : 'Kominote') :
                           // Fallback for incorrect data
                           post.tag === 'sommeil' ? (language === 'fr' ? 'Sommeil bébé' : 'Dòmi tibebe') :
                           post.tag === 'alimentation' ? (language === 'fr' ? 'Alimentation' : 'Alimantasyon') :
                           post.tag}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-xl"
                        onClick={() => handleHidePost(post.id)}
                        disabled={actionLoading === post.id}
                      >
                        <EyeOff className="mr-1 h-3 w-3" />
                        {t("hide")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => handleUnhidePost(post.id)}
                        disabled={actionLoading === post.id}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        OK
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="userReports" className="space-y-4">
          {userReports.length === 0 ? (
            <Card className="rounded-[2rem]">
              <CardContent className="py-8 text-center text-slate-500">
                {noUserReportsLabel}
              </CardContent>
            </Card>
          ) : (
            userReports.map((report) => {
              const reportedUser = usersById.get(report.reportedUserId);
              const reportActionKey = `user-report:${report.id}`;
              const isResolvingUserReport = actionLoading === reportActionKey;
              const isResolutionPanelOpen = resolutionDraft.kind === "user" && resolutionDraft.reportId === report.id;

              return (
                <Card key={report.id} className="rounded-2xl border-rose-100 bg-rose-50/30">
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2 text-sm text-slate-700">
                          <div>
                            <strong>{language === "ht" ? "Kont rapòte:" : "Compte signalé :"}</strong>{" "}
                            {report.reportedUserName || reportedUser?.name || report.reportedUserId || "-"}
                          </div>
                          <div>
                            <strong>{language === "ht" ? "Moun ki rapòte a:" : "Signalé par :"}</strong>{" "}
                            {report.reporterUserName || report.reporterUserId || "-"}
                          </div>
                          <div>
                            <strong>{t("reason")}</strong> {report.reason || "-"}
                          </div>
                          {report.details && (
                            <div>
                              <strong>{language === "ht" ? "Detay:" : "Détails :"}</strong> {report.details}
                            </div>
                          )}
                          {report.conversationId && (
                            <div>
                              <strong>{language === "ht" ? "Konvèsasyon:" : "Conversation :"}</strong> {report.conversationId}
                            </div>
                          )}
                          {report.createdAt && (
                            <div className="text-xs text-slate-400">{formatDate(report.createdAt, language)}</div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => (isResolutionPanelOpen ? closeResolutionPanel() : openResolutionPanel("user", report.id))}
                          disabled={isResolvingUserReport}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {isResolutionPanelOpen ? closeResolutionLabel : resolveLabel}
                        </Button>
                      </div>

                      {isResolutionPanelOpen ? (
                        <div className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-4 shadow-sm">
                          <div className="mb-3 text-sm font-semibold text-slate-900">{resolutionPanelLabel}</div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{resolutionTypeLabel}</div>
                              <Select value={resolutionDraft.resolution} onValueChange={(value) => updateResolutionDraft("resolution", value)}>
                                <SelectTrigger className="rounded-xl bg-white">
                                  <SelectValue placeholder={resolutionTypeLabel} />
                                </SelectTrigger>
                                <SelectContent>
                                  {userResolutionOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{resolutionNoteLabel}</div>
                              <Textarea
                                value={resolutionDraft.note}
                                onChange={(event) => updateResolutionDraft("note", event.target.value)}
                                placeholder={resolutionNotePlaceholder}
                                className="min-h-[120px] rounded-xl bg-white"
                              />
                            </div>
                          </div>
                          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <Button type="button" variant="outline" className="rounded-xl" onClick={closeResolutionPanel}>
                              {closeResolutionLabel}
                            </Button>
                            <Button
                              type="button"
                              className="rounded-xl"
                              onClick={() => handleResolveUserReport(report.id)}
                              disabled={isResolvingUserReport}
                            >
                              {saveResolutionLabel}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports" className="space-y-4">
          {reports.length === 0 ? (
            <Card className="rounded-[2rem]">
              <CardContent className="py-8 text-center text-slate-500">
                {t("noOpenReports")}
              </CardContent>
            </Card>
          ) : (
            reports.map((report) => {
              const reportActionKey = `report:${report.id}`;
              const isResolvingReport = actionLoading === reportActionKey;
              const isResolutionPanelOpen = resolutionDraft.kind === "post" && resolutionDraft.reportId === report.id;

              return (
                <Card key={report.id} className="rounded-2xl">
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="text-sm text-slate-600">
                            <strong>{t("postId")}</strong> {report.postId}
                          </div>
                          <div className="text-sm text-slate-600">
                            <strong>{t("reason")}</strong> {report.reason}
                          </div>
                          {report.createdAt && (
                            <div className="mt-1 text-xs text-slate-400">
                              {formatDate(report.createdAt, language)}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => (isResolutionPanelOpen ? closeResolutionPanel() : openResolutionPanel("post", report.id))}
                          disabled={isResolvingReport}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {isResolutionPanelOpen ? closeResolutionLabel : resolveLabel}
                        </Button>
                      </div>

                      {isResolutionPanelOpen ? (
                        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
                          <div className="mb-3 text-sm font-semibold text-slate-900">{resolutionPanelLabel}</div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{resolutionTypeLabel}</div>
                              <Select value={resolutionDraft.resolution} onValueChange={(value) => updateResolutionDraft("resolution", value)}>
                                <SelectTrigger className="rounded-xl bg-white">
                                  <SelectValue placeholder={resolutionTypeLabel} />
                                </SelectTrigger>
                                <SelectContent>
                                  {postResolutionOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{resolutionNoteLabel}</div>
                              <Textarea
                                value={resolutionDraft.note}
                                onChange={(event) => updateResolutionDraft("note", event.target.value)}
                                placeholder={resolutionNotePlaceholder}
                                className="min-h-[120px] rounded-xl bg-white"
                              />
                            </div>
                          </div>
                          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <Button type="button" variant="outline" className="rounded-xl" onClick={closeResolutionPanel}>
                              {closeResolutionLabel}
                            </Button>
                            <Button
                              type="button"
                              className="rounded-xl"
                              onClick={() => handleResolveReport(report.id)}
                              disabled={isResolvingReport}
                            >
                              {saveResolutionLabel}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* All Posts */}
        <TabsContent value="posts" className="space-y-4">
          {allPosts.map((post) => (
            <Card
              key={post.id}
              className={`rounded-2xl ${post.hidden ? "border-red-100 bg-red-50/20 opacity-60" : ""}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{post.authorName || t("anonymous")}</span>
                      {post.hidden && <Badge variant="destructive" className="rounded-full">{t("hidden")}</Badge>}
                      {post.reported && <Badge className="rounded-full bg-pink-100 text-pink-700">{t("reported")}</Badge>}
                      {post.tag && <Badge variant="secondary" className="rounded-full">
                          {post.tag === 'tagFeeding' ? (language === 'fr' ? 'Alimentation' : 'Alimantasyon') :
                           post.tag === 'tagSleep' ? (language === 'fr' ? 'Sommeil bébé' : 'Dòmi tibebe') :
                           post.tag === 'tagPostpartum' ? 'Post-partum' :
                           post.tag === 'tagCreole' ? (language === 'fr' ? 'Mères dans la diaspora' : 'Manman nan diaspora') :
                           post.tag === 'tagWorkKids' ? (language === 'fr' ? 'Travail et enfants' : 'Travay ak timoun') :
                           post.tag === 'tagHealth' ? (language === 'fr' ? 'Santé' : 'Lasante') :
                           post.tag === 'tagEducation' ? (language === 'fr' ? 'Éducation' : 'Edikasyon') :
                           post.tag === 'tagCommunity' ? (language === 'fr' ? 'Communauté' : 'Kominote') :
                           // Fallback for incorrect data
                           post.tag === 'sommeil' ? (language === 'fr' ? 'Sommeil bébé' : 'Dòmi tibebe') :
                           post.tag === 'alimentation' ? (language === 'fr' ? 'Alimentation' : 'Alimantasyon') :
                           post.tag}
                        </Badge>}
                    </div>
                    <h3 className="mt-1 font-medium">{post.title}</h3>
                    <p className="mt-1 text-sm text-slate-600 line-clamp-2">{post.body}</p>
                  </div>
                  <div className="flex gap-2">
                    {post.hidden ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => handleUnhidePost(post.id)}
                        disabled={actionLoading === post.id}
                      >
                        <Eye className="mr-1 h-3 w-3" /> {t("show")}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-xl"
                        onClick={() => handleHidePost(post.id)}
                        disabled={actionLoading === post.id}
                      >
                        <EyeOff className="mr-1 h-3 w-3" /> {t("hide")}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="space-y-4">
          {roleFeedback.message ? (
            <div className={roleFeedback.tone === "error" ? "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" : "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"}>
              {roleFeedback.message}
            </div>
          ) : null}
          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardTitle className="text-lg">{t("userList")} ({users.length})</CardTitle>
              <CardDescription>{t("userListDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {users.map((u) => {
                  const statusMeta = getUserStatusMeta(u);
                  const reportCount = userReportCountByUserId[u.id] || 0;
                  const moderationDisabled = u.id === user?.uid || String(u.role || "").trim().toLowerCase() === "admin";
                  const isDoctorEditor = String(u.role || "").trim().toLowerCase() === "doctor_editor";
                  const isDoctorRole = String(u.role || "").trim().toLowerCase() === "doctor";
                  const isMessageToggleLoading = actionLoading === `user:${u.id}:messages`;
                  const isProfileToggleLoading = actionLoading === `user:${u.id}:profile`;
                  const isReviewLoading = actionLoading === `user:${u.id}:review`;
                  const isSuspendLoading = actionLoading === `user:${u.id}:suspend`;
                  const isRoleToggleLoading = actionLoading === `user:${u.id}:role`;
                  const isDoctorRoleLoading = actionLoading === `user:${u.id}:doctor-role`;

                  return (
                    <div key={u.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{u.name || t("withoutName")}</span>
                          {u.role === "admin" && (
                            <Badge className="rounded-full bg-violet-100 text-violet-700">Admin</Badge>
                          )}
                          {isDoctorEditor && (
                            <Badge className="rounded-full bg-sky-100 text-sky-700">{doctorEditorLabel}</Badge>
                          )}
                          {isDoctorRole && (
                            <Badge className="rounded-full bg-emerald-100 text-emerald-700">{doctorRoleLabel}</Badge>
                          )}
                          <Badge className={`rounded-full ${statusMeta.className}`}>{statusMeta.label}</Badge>
                          {u.messagingRestricted && (
                            <Badge variant="secondary" className="rounded-full">{messagesRestrictedLabel}</Badge>
                          )}
                          {u.profileHidden && (
                            <Badge variant="secondary" className="rounded-full">{profileHiddenLabel}</Badge>
                          )}
                          {reportCount > 0 && (
                            <Badge className="rounded-full bg-rose-100 text-rose-700">{reportCount} {userReportsLabel}</Badge>
                          )}
                        </div>
                        <div className="text-sm text-slate-500">
                          {u.email} • {u.city || "?"} • {u.country || "?"}
                        </div>
                        {u.createdAt && (
                          <div className="text-xs text-slate-400">{formatDate(u.createdAt)}</div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => handleToggleDoctorRole(u)}
                          disabled={moderationDisabled || isDoctorRoleLoading}
                        >
                          {isDoctorRole ? removeDoctorRoleLabel : grantDoctorRoleLabel}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => handleModerateUser(u, { moderationStatus: "under_review" }, "review")}
                          disabled={moderationDisabled || isReviewLoading}
                        >
                          {reviewUserLabel}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => handleModerateUser(u, { messagingRestricted: !u.messagingRestricted }, "messages")}
                          disabled={moderationDisabled || isMessageToggleLoading}
                        >
                          {u.messagingRestricted ? enableMessagesLabel : restrictMessagesLabel}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => handleModerateUser(u, { profileHidden: !u.profileHidden }, "profile")}
                          disabled={moderationDisabled || isProfileToggleLoading}
                        >
                          {u.profileHidden ? showProfileLabel : hideProfileLabel}
                        </Button>
                        <Button
                          size="sm"
                          variant={statusMeta.key === "suspended" ? "outline" : "destructive"}
                          className="rounded-xl"
                          onClick={() => handleModerateUser(
                            u,
                            statusMeta.key === "suspended"
                              ? { moderationStatus: "active", messagingRestricted: false, profileHidden: false }
                              : { moderationStatus: "suspended", messagingRestricted: true, profileHidden: true },
                            "suspend"
                          )}
                          disabled={moderationDisabled || isSuspendLoading}
                        >
                          {statusMeta.key === "suspended" ? reactivateUserLabel : suspendUserLabel}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="doctorProfiles" className="space-y-4">
          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardTitle className="text-lg">{doctorProfilesLabel} ({doctorProfiles.length})</CardTitle>
              <CardDescription>{language === "ht" ? "Lye chak pwofil medsen ak bon kont pou pwofesyonèl la ka modifye fich li ak atik li yo." : "Liez chaque profil médecin au bon compte pour que le professionnel retrouve sa fiche et ses articles."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {doctorProfileFeedback.message ? (
                <div className={doctorProfileFeedback.tone === "error" ? "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" : "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"}>
                  {doctorProfileFeedback.message}
                </div>
              ) : null}
              {doctorProfiles.length === 0 ? (
                <div className="py-8 text-center text-slate-500">{noDoctorProfilesLabel}</div>
              ) : (
                <div className="space-y-4">
                  {doctorProfiles.map((profile) => {
                    const linkedUserId = String(profile.editorUserId || "").trim();
                    const linkedUser = usersById.get(linkedUserId);
                    const suggestedUser = usersByEmail.get(String(profile.email || "").trim().toLowerCase());
                    const selectedUserId = String(doctorProfileAssignments[profile.id] || linkedUserId || suggestedUser?.id || "").trim();
                    const selectedUser = usersById.get(selectedUserId);
                    const isAssignLoading = actionLoading === `doctor-profile:${profile.id}:assign`;

                    return (
                      <div key={profile.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/60 p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-slate-900">{profile.displayName || profile.id}</span>
                              <Badge className="rounded-full bg-sky-100 text-sky-700">{profile.specialty || "-"}</Badge>
                              <Badge className={linkedUser ? "rounded-full bg-emerald-100 text-emerald-700" : "rounded-full bg-amber-100 text-amber-800"}>
                                {linkedUser ? linkedAccountLabel : unlinkedAccountLabel}
                              </Badge>
                            </div>
                            <div className="text-sm text-slate-600">
                              {profile.email || "-"} • {profile.city || "?"} • {profile.country || "?"}
                            </div>
                            <div className="text-sm text-slate-500">
                              {linkedUser
                                ? `${linkedAccountLabel}: ${linkedUser.name || t("withoutName")} (${linkedUser.email || linkedUser.id})`
                                : `${linkedAccountLabel}: ${unlinkedAccountLabel}`}
                            </div>
                          </div>
                          <div className="w-full max-w-xl space-y-3">
                            <div className="space-y-2">
                              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{doctorTargetLabel}</div>
                              <Select value={selectedUserId} onValueChange={(value) => setDoctorProfileAssignments((prev) => ({ ...prev, [profile.id]: value }))}>
                                <SelectTrigger className="rounded-xl bg-white">
                                  <SelectValue placeholder={doctorTargetPlaceholder} />
                                </SelectTrigger>
                                <SelectContent>
                                  {doctorAssignableUsers.map((candidate) => (
                                    <SelectItem key={candidate.id} value={candidate.id}>
                                      {(candidate.name || t("withoutName")) + " - " + (candidate.email || candidate.id)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="text-sm text-slate-500">
                                {selectedUser ? `${doctorTargetLabel}: ${selectedUser.name || t("withoutName")}` : doctorTargetPlaceholder}
                              </div>
                              <Button type="button" className="rounded-xl" onClick={() => handleAssignDoctorProfile(profile)} disabled={isAssignLoading || !selectedUserId}>
                                {isAssignLoading ? linkDoctorProfileLabel + "..." : linkDoctorProfileLabel}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderationLogs" className="space-y-4">
          {moderationLogs.length === 0 ? (
            <Card className="rounded-[2rem]">
              <CardContent className="py-8 text-center text-slate-500">
                {noModerationLogsLabel}
              </CardContent>
            </Card>
          ) : (
            moderationLogs.map((entry) => (
              <Card key={entry.id} className="rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2 text-sm text-slate-700">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="rounded-full bg-slate-100 text-slate-700">
                          {formatModerationActionLabel(entry.action)}
                        </Badge>
                        {entry.targetType && (
                          <Badge variant="outline" className="rounded-full">{entry.targetType}</Badge>
                        )}
                      </div>
                      <div>
                        <strong>{language === "ht" ? "Ajan:" : "Acteur :"}</strong> {entry.actorUserId || "system"}
                      </div>
                      <div>
                        <strong>{language === "ht" ? "Sib:" : "Cible :"}</strong> {entry.targetId || "-"}
                      </div>
                      {entry.details?.reason && (
                        <div>
                          <strong>{t("reason")}</strong> {entry.details.reason}
                        </div>
                      )}
                      {entry.details?.note && (
                        <div>
                          <strong>{language === "ht" ? "Nòt:" : "Note :"}</strong> {entry.details.note}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {entry.createdAt ? formatDate(entry.createdAt) : ""}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="shopProducts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-2xl border-0 bg-orange-50 shadow-none">
              <CardContent className="p-4">
                <div className="text-2xl font-semibold">{availableShopItemsCount}</div>
                <div className="text-sm text-slate-600">{availableLabel}</div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 bg-emerald-50 shadow-none">
              <CardContent className="p-4">
                <div className="text-2xl font-semibold">{soldShopItemsCount}</div>
                <div className="text-sm text-slate-600">{soldLabel}</div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 bg-slate-50 shadow-none">
              <CardContent className="p-4">
                <div className="text-2xl font-semibold">{shopItems.length}</div>
                <div className="text-sm text-slate-600">{shopProductsLabel}</div>
              </CardContent>
            </Card>
          </div>

          {shopItems.length === 0 ? (
            <Card className="rounded-[2rem]">
              <CardContent className="py-8 text-center text-slate-500">
                {noShopItemsLabel}
              </CardContent>
            </Card>
          ) : (
            shopItems.map((item) => (
              <Card key={item.id} className="rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{item.title || item.name || "Article"}</span>
                        <Badge className={`rounded-full ${item.status === "sold" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
                          {item.status === "sold" ? soldLabel : availableLabel}
                        </Badge>
                        <Badge className={`rounded-full ${item.sellerType === "affiliate_shop" || item.shopName ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-700"}`}>
                          {item.sellerType === "affiliate_shop" || item.shopName ? affiliateShopLabel : communitySellerLabel}
                        </Badge>
                        {item.category && (
                          <Badge variant="secondary" className="rounded-full">
                            {item.category}
                          </Badge>
                        )}
                        {item.shopName && (
                          <Badge variant="outline" className="rounded-full">
                            {item.shopName}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        {item.description}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                        <span>{formatMoney(item.price)}</span>
                        <span>{item.authorName || t("withoutName")}</span>
                        {item.shopName && <span>{shopNameLabel}: {item.shopName}</span>}
                        <span>{item.location || "?"}</span>
                        <span>{item.contact || item.moncashPhone || "-"}</span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      {item.createdAt ? formatDate(item.createdAt) : ""}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="shopOrders" className="space-y-4">
          <Card className="rounded-2xl border-amber-100 bg-amber-50/60 shadow-none">
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {language === "ht" ? "Sipò kòmand ak pèman" : "Support commandes et paiements"}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {language === "ht"
                    ? "Itilize nimewo ofisyèl sa a pou swiv ka ki mande verifikasyon manyèl, litij oswa ranbousman."
                    : "Utilisez ce numéro officiel pour suivre les cas nécessitant une vérification manuelle, un litige ou un remboursement."}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`tel:${supportPhoneHref}`}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                >
                  {supportPhoneLabel}
                </a>
                <a
                  href={`https://wa.me/${supportPhoneHref}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                  WhatsApp
                </a>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="rounded-2xl border-0 bg-amber-50 shadow-none">
              <CardContent className="p-4">
                <div className="text-2xl font-semibold">{shopOrders.length}</div>
                <div className="text-sm text-slate-600">{shopOrdersLabel}</div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 bg-emerald-50 shadow-none">
              <CardContent className="p-4">
                <div className="text-2xl font-semibold">{completedShopOrdersCount}</div>
                <div className="text-sm text-slate-600">{completedLabel}</div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 bg-violet-50 shadow-none">
              <CardContent className="p-4">
                <div className="text-2xl font-semibold">{formatMoney(totalCommission)}</div>
                <div className="text-sm text-slate-600">{totalCommissionLabel}</div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 bg-cyan-50 shadow-none">
              <CardContent className="p-4">
                <div className="text-2xl font-semibold">{formatMoney(totalSellerAmount)}</div>
                <div className="text-sm text-slate-600">{totalSellerLabel}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-2xl border-0 bg-amber-50 shadow-none">
              <CardContent className="p-4">
                <div className="text-2xl font-semibold">{monitoringShopOrdersCount}</div>
                <div className="text-sm text-slate-600">{monitoringLabel}</div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 bg-rose-50 shadow-none">
              <CardContent className="p-4">
                <div className="text-2xl font-semibold">{shopOrdersNeedingAttentionCount}</div>
                <div className="text-sm text-slate-600">{actionRequiredLabel}</div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 bg-slate-100 shadow-none">
              <CardContent className="p-4">
                <div className="text-2xl font-semibold">{refundedShopOrdersCount}</div>
                <div className="text-sm text-slate-600">{refundedLabel}</div>
              </CardContent>
            </Card>
          </div>

          {shopOrders.length === 0 ? (
            <Card className="rounded-[2rem]">
              <CardContent className="py-8 text-center text-slate-500">
                {noShopOrdersLabel}
              </CardContent>
            </Card>
          ) : (
            shopOrders.map((order) => {
              const orderStatusMeta = getOrderStatusMeta(order);
              const supportStatusMeta = getSupportStatusMeta(order);
              const isOrderActionLoading = actionLoading === `order:${order.id}`;
              const paymentModeLabel = order.paymentMethod === "natcash"
                ? "NatCash"
                : order.realMonCash
                  ? "MonCash"
                  : "Demo";

              return (
                <Card
                  key={order.id}
                  className={`rounded-2xl ${
                    supportStatusMeta.key === "action_required"
                      ? "border-rose-200 bg-rose-50/20"
                      : supportStatusMeta.key === "monitoring"
                        ? "border-amber-200 bg-amber-50/20"
                        : ""
                  }`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{order.itemTitle || "Article"}</span>
                          <Badge className={`rounded-full ${orderStatusMeta.className}`}>
                            {orderStatusMeta.label}
                          </Badge>
                          <Badge variant="secondary" className="rounded-full">
                            {order.deliveryOption === "delivery" ? deliveryLabel : pickupLabel}
                          </Badge>
                          <Badge className={`rounded-full ${order.sellerType === "affiliate_shop" || order.shopName ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-700"}`}>
                            {order.sellerType === "affiliate_shop" || order.shopName ? affiliateShopLabel : communitySellerLabel}
                          </Badge>
                          {supportStatusMeta.key !== "none" && (
                            <Badge className={`rounded-full ${supportStatusMeta.className}`}>
                              {supportStatusMeta.label}
                            </Badge>
                          )}
                          <Badge variant="outline" className="rounded-full">
                            {paymentModeLabel}
                          </Badge>
                          {order.shopName && (
                            <Badge variant="outline" className="rounded-full">
                              {order.shopName}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                          <div><strong>Acheteur:</strong> {order.buyerName || "-"}</div>
                          <div><strong>Vendeur:</strong> {order.sellerName || "-"}</div>
                          <div><strong>{shopNameLabel}:</strong> {order.shopName || "-"}</div>
                          <div><strong>Total:</strong> {formatMoney(order.totalAmount)}</div>
                          <div><strong>Produit:</strong> {formatMoney(order.productAmount)}</div>
                          <div><strong>Livraison:</strong> {formatMoney(order.deliveryFee)}</div>
                          <div><strong>Commission:</strong> {formatMoney(order.commissionAmount)}</div>
                          <div><strong>Net vendeur:</strong> {formatMoney(order.sellerAmount)}</div>
                          <div><strong>Référence:</strong> {order.referenceNumber || "-"}</div>
                          <div><strong>Transaction:</strong> {order.transactionId || "-"}</div>
                          <div><strong>Téléphone:</strong> {order.buyerPhone || "-"}</div>
                          <div><strong>Paiement:</strong> {order.paymentMethod || "-"}</div>
                          <div><strong>Mode:</strong> {paymentModeLabel}</div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {supportStatusMeta.key !== "monitoring" && orderStatusMeta.key !== "completed" && orderStatusMeta.key !== "refunded" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => handleShopOrderUpdate(order, { supportStatus: "monitoring" })}
                              disabled={isOrderActionLoading}
                            >
                              {monitoringLabel}
                            </Button>
                          )}
                          {supportStatusMeta.key !== "action_required" && orderStatusMeta.key !== "refunded" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50"
                              onClick={() => handleShopOrderUpdate(order, { supportStatus: "action_required" })}
                              disabled={isOrderActionLoading}
                            >
                              {language === "ht" ? "Gen pwoblèm" : "Signaler un problème"}
                            </Button>
                          )}
                          {orderStatusMeta.key !== "completed" && (
                            <Button
                              size="sm"
                              className="rounded-xl"
                              onClick={() =>
                                handleShopOrderUpdate(order, {
                                  status: "completed",
                                  paymentStatus: "completed",
                                  supportStatus: "resolved",
                                })
                              }
                              disabled={isOrderActionLoading}
                            >
                              {language === "ht" ? "Konfime" : "Confirmer"}
                            </Button>
                          )}
                          {orderStatusMeta.key !== "refunded" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() =>
                                handleShopOrderUpdate(order, {
                                  status: "refunded",
                                  paymentStatus: "refunded",
                                  supportStatus: "refunded",
                                })
                              }
                              disabled={isOrderActionLoading}
                            >
                              {language === "ht" ? "Ranbouse" : "Rembourser"}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        {order.createdAt ? formatDate(order.createdAt) : ""}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

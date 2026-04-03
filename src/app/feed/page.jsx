"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getPostsPage, getDiscoverableUsers, getGroups, searchShopItems } from "@/lib/firestore";
import PostCard from "@/components/posts/PostCard";
import PostForm from "@/components/posts/PostForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials, resolveProfilePhoto } from "@/lib/utils";
import {
  Search,
  MessageCircle,
  Users,
  ShoppingBag,
  UserRound,
  Sparkles,
  MapPin,
} from "lucide-react";

const getTrendingTopics = (language) => [
  language === 'fr' ? 'Sommeil bébé' : 'Dòmi tibebe',
  language === 'fr' ? 'Alimentation' : 'Alimantasyon',
  'Post-partum',
  language === 'fr' ? 'Mères dans la diaspora' : 'Manman nan diaspora',
  language === 'fr' ? 'Travail et enfants' : 'Travay ak timoun',
];

const cities = [
  "Tout kote",
  "Port-au-Prince",
  "Montréal",
  "Miami",
  "Paris",
  "Boston",
  "Santiago",
];

const LEGACY_POST_TAG_TO_KEY = {
  sommeil: "tagSleep",
  alimentation: "tagFeeding",
  postpartum: "tagPostpartum",
  diaspora: "tagCreole",
  communaute: "tagCommunity",
};

const getDefaultFeedGroups = (t) => [
  { id: "nouveau-ne", name: t("groupNewborn"), description: t("groupNewbornDesc"), members: [], adminIds: [], moderatorIds: [] },
  { id: "enfants", name: t("groupChildren"), description: t("groupChildrenDesc"), members: [], adminIds: [], moderatorIds: [] },
  { id: "adolescents", name: t("groupTeens"), description: t("groupTeensDesc"), members: [], adminIds: [], moderatorIds: [] },
  { id: "post-partum", name: t("groupPostpartum"), description: t("groupPostpartumDesc"), members: [], adminIds: [], moderatorIds: [] },
  { id: "diaspora", name: t("groupDiaspora"), description: t("groupDiasporaDesc"), members: [], adminIds: [], moderatorIds: [] },
  { id: "alimentation", name: t("groupFeeding"), description: t("groupFeedingDesc"), members: [], adminIds: [], moderatorIds: [] },
  { id: "travay-fanmi", name: t("groupWorkFamily"), description: t("groupWorkFamilyDesc"), members: [], adminIds: [], moderatorIds: [] },
  { id: "paran-otis", name: t("groupAutismParents"), description: t("groupAutismParentsDesc"), members: [], adminIds: [], moderatorIds: [] },
  { id: "deuil-perte", name: t("groupGriefLoss"), description: t("groupGriefLossDesc"), members: [], adminIds: [], moderatorIds: [] },
];

function getGroupMemberIds(group = {}) {
  return Array.from(
    new Set(
      [
        ...(Array.isArray(group.members) ? group.members : []),
        ...(Array.isArray(group.adminIds) ? group.adminIds : []),
        ...(Array.isArray(group.moderatorIds) ? group.moderatorIds : []),
        typeof group.ownerId === "string" ? group.ownerId : "",
        typeof group.createdBy === "string" ? group.createdBy : "",
      ].filter((value) => typeof value === "string" && value.trim())
    )
  );
}

function normalizeGroupRecord(group = {}) {
  const members = getGroupMemberIds(group);

  return {
    ...group,
    members,
    membersCount: members.length,
  };
}

function getTagLabel(tag, t) {
  const normalizedTag = String(tag || "").trim();
  if (!normalizedTag) {
    return "";
  }

  const mappedTagKey = LEGACY_POST_TAG_TO_KEY[normalizedTag.toLowerCase()] || normalizedTag;
  return mappedTagKey.startsWith("tag") ? t(mappedTagKey) : normalizedTag;
}

function getMemberLocationLabel(member = {}) {
  return member.city || member.country || "Diaspora";
}

function getMemberRecommendationReason(discoveryUi, member = {}, userProfile = {}) {
  const userCity = String(userProfile.city || "").trim().toLowerCase();
  const memberCity = String(member.city || "").trim().toLowerCase();
  if (userCity && memberCity && userCity === memberCity) {
    return discoveryUi.sameCityReason;
  }

  const userCountry = String(userProfile.country || "").trim().toLowerCase();
  const memberCountry = String(member.country || "").trim().toLowerCase();
  if (userCountry && memberCountry && userCountry === memberCountry) {
    return discoveryUi.sameCountryReason;
  }

  const userChildAges = String(userProfile.childAges || "").trim().toLowerCase();
  const memberChildAges = String(member.childAges || "").trim().toLowerCase();
  if (
    userChildAges &&
    memberChildAges &&
    (userChildAges === memberChildAges ||
      userChildAges.includes(memberChildAges) ||
      memberChildAges.includes(userChildAges))
  ) {
    return discoveryUi.sameStageReason;
  }

  const userBioTokens = String(userProfile.bio || "")
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 4);
  const memberBio = String(member.bio || "").toLowerCase();
  if (userBioTokens.length > 0 && memberBio && userBioTokens.some((token) => memberBio.includes(token))) {
    return discoveryUi.sharedInterestReason;
  }

  return discoveryUi.communityReason;
}

function SpotlightMemberCard({ discoveryUi, member, onClick, t, compact = false }) {
  const memberPhoto = resolveProfilePhoto(
    member.photo,
    member.photoURL,
    member.photoUpdatedAt || member.updatedAt
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${compact ? "w-full max-w-none" : "w-[250px]"} card-hover group ${compact ? "" : "shrink-0"} rounded-[1.6rem] border border-rose-100/80 bg-gradient-to-br from-white via-white to-rose-50/80 p-4 text-left shadow-[0_18px_50px_-32px_rgba(190,24,93,0.24)]`}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-14 w-14 ring-2 ring-rose-100">
          {memberPhoto && <AvatarImage src={memberPhoto} />}
          <AvatarFallback className="bg-gradient-to-br from-rose-400 to-pink-500 text-white">
            {getInitials(member.name || t("user"))}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          {member.recommendationReason ? (
            <div className="mb-2 inline-flex max-w-full rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {member.recommendationReason}
            </div>
          ) : null}
          <div className="truncate text-[1.02rem] font-semibold tracking-[-0.02em] text-slate-900">
            {member.name || t("user")}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {getMemberLocationLabel(member)}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full bg-rose-50 text-rose-700">
              {discoveryUi.premiumSelection}
            </Badge>
            {member.childAges ? (
              <Badge variant="secondary" className="rounded-full bg-white text-slate-600">
                {member.childAges}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 min-h-[3.5rem] text-sm leading-6 text-slate-600">
        {member.bio
          ? member.bio.slice(0, 92) + (member.bio.length > 92 ? "…" : "")
          : `${discoveryUi.memberSince} · ${getMemberLocationLabel(member)}`}
      </div>

      <div className="mt-4 flex items-center justify-end text-sm font-medium text-rose-700 transition group-hover:text-rose-800">
        <span className="rounded-full border border-rose-100 bg-white/90 px-3 py-1.5 text-xs font-semibold shadow-sm transition group-hover:border-rose-200">
          {discoveryUi.viewProfile}
        </span>
      </div>
    </button>
  );
}

const FEED_BOOTSTRAP_TIMEOUT_MS = 12000;
const FEED_MEMBERS_PAGE_SIZE = 24;
const FEED_MEMBER_SPOTLIGHT_STEP = 8;
const FEED_SHOP_PAGE_SIZE = 12;
const FEED_SHOP_PREVIEW_STEP = 3;
const FEED_POSTS_PAGE_SIZE = 12;

function createFeedTimeoutError(code = "feed_bootstrap_timeout") {
  const error = new Error(code);
  error.code = code;
  return error;
}

function withFeedTimeout(promise, timeoutMs = FEED_BOOTSTRAP_TIMEOUT_MS, timeoutCode = "feed_bootstrap_timeout") {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(createFeedTimeoutError(timeoutCode));
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

export default function FeedPage() {
  const { user, userProfile } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [shopItems, setShopItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const profilePhoto = resolveProfilePhoto(
    userProfile?.photo,
    user?.photoURL,
    userProfile?.photoUpdatedAt || userProfile?.updatedAt
  );
  const discoveryUi = language === "ht"
    ? {
        discoveryTitle: "Dekouvri pi byen",
        discoveryDescription: "Jwenn manm, gwoup, piblikasyon ak atik boutique ki pi itil pou ou.",
        allResults: "Tout rezilta yo",
        membersResults: "Manm yo",
        groupsResults: "Gwoup yo",
        shopResults: "Boutik la",
        recommendedForYou: "Rekòmande pou ou",
        nearbyMoms: "Pwofil ki pre w",
        stageContent: "Kontni pou etap ou",
        diasporaGroups: "Gwoup diaspora yo",
        noMembersMatch: "Pa gen manm ki koresponn ak rechèch la.",
        noGroupsMatch: "Pa gen gwoup ki koresponn ak rechèch la.",
        noShopMatch: "Pa gen atik boutik ki koresponn ak rechèch la.",
        noRecommendations: "Nou poko jwenn rekòmandasyon pèsonalize.",
        viewProfile: "Wè pwofil",
        viewGroup: "Wè gwoup la",
        viewGroups: "Wè gwoup yo",
        openBoutique: "Wè boutique la",
        openPost: "Li post la",
        memberSince: "Manm",
        relevantGroup: "Gwoup ki enpòtan",
        nearbyBadge: "Toupre",
        diasporaBadge: "Diaspora",
        childAgeBadge: "Laj timoun",
        cityBadge: "Vil",
        searchMembersGroupsShop: "Chèche manm, gwoup, posts oswa boutik",
        heroEyebrow: "Dekouvèt Lakou Manman",
        heroHeadline: "Pwofil, gwoup ak bon plan pou ou.",
        heroBody: "Jwenn pi vit pwofil aktif, kominote itil ak atik boutique ki adapte ak lavi ou chak jou.",
        memberSpotlight: "Pwofil pou ou",
        curatedGroupsTitle: "Gwoup pou rantre ladan yo",
        curatedShopTitle: "Boutique coup de cœur",
        premiumSelection: "Pou ou",
        discoverMember: "Dekouvri",
        sameCityReason: "Menm vil",
        sameCountryReason: "Menm peyi",
        sameStageReason: "Menm etap lavi",
        sharedInterestReason: "Sant enterè ki sanble",
        communityReason: "Pou kominote ou",
        dailyQuestionPrompt: "Ki pi gwo defi w kòm manman semèn sa a?",
        dailyQuestionBody: "Dòmi tibebe, manje, fatig, tan pou tèt ou, oswa òganizasyon lakay?",
        loadError: "Nou pa t ka chaje feed la kounye a.",
        loadTimeout: "Chajman feed la pran twòp tan. Verifye koneksyon an epi eseye ankò.",
        loadMoreMembers: "Chaje plis manm",
        loadMoreShop: "Chaje plis atik",
        loadingMore: "Chajman an ap kontinye...",
        loadMorePosts: "Chaje plis piblikasyon",
        endOfFeed: "Ou rive nan fen aktyalite yo pou kounye a.",
      }
    : {
        discoveryTitle: "Mieux découvrir",
        discoveryDescription: "Trouvez les membres, groupes, publications et articles boutique les plus utiles pour vous.",
        allResults: "Tous les résultats",
        membersResults: "Membres",
        groupsResults: "Groupes",
        shopResults: "Boutique",
        recommendedForYou: "Recommandé pour vous",
        nearbyMoms: "Profils proches",
        stageContent: "Contenus pour votre étape",
        diasporaGroups: "Groupes diaspora",
        noMembersMatch: "Aucun membre ne correspond à la recherche.",
        noGroupsMatch: "Aucun groupe ne correspond à la recherche.",
        noShopMatch: "Aucun article boutique ne correspond à la recherche.",
        noRecommendations: "Aucune recommandation personnalisée pour le moment.",
        viewProfile: "Voir le profil",
        viewGroup: "Voir le groupe",
        viewGroups: "Voir les groupes",
        openBoutique: "Voir la boutique",
        openPost: "Lire le post",
        memberSince: "Membre",
        relevantGroup: "Groupe pertinent",
        nearbyBadge: "Proche",
        diasporaBadge: "Diaspora",
        childAgeBadge: "Âge enfant",
        cityBadge: "Ville",
        searchMembersGroupsShop: "Rechercher membres, groupes, posts ou boutique",
        heroEyebrow: "Découverte Lakou Manman",
        heroHeadline: "Profils, groupes et trouvailles pour vous.",
        heroBody: "Repérez plus vite les profils actifs, les communautés utiles et les articles boutique adaptés à votre quotidien.",
        memberSpotlight: "Profils pour vous",
        curatedGroupsTitle: "Groupes à rejoindre",
        curatedShopTitle: "Boutique coup de cœur",
        premiumSelection: "Pour vous",
        discoverMember: "Découvrir",
        sameCityReason: "Même ville",
        sameCountryReason: "Même pays",
        sameStageReason: "Même étape de vie",
        sharedInterestReason: "Centres d'intérêt proches",
        communityReason: "Pour votre communauté",
        dailyQuestionPrompt: "Quel est votre plus grand défi de maman cette semaine ?",
        dailyQuestionBody: "Sommeil du bébé, repas, fatigue, temps pour vous ou organisation de la maison ?",
        loadError: "Le feed n'a pas pu être chargé pour le moment.",
        loadTimeout: "Le chargement du feed a dépassé le délai prévu. Vérifiez la connexion puis réessayez.",
        loadMoreMembers: "Charger plus de membres",
        loadMoreShop: "Charger plus d'articles",
        loadingMore: "Chargement en cours...",
        loadMorePosts: "Charger plus de publications",
        endOfFeed: "Vous êtes arrivée à la fin des actualités pour le moment.",
      };
  
  const trendingTopics = getTrendingTopics(language);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [memberQueryLimit, setMemberQueryLimit] = useState(48);
  const [memberSpotlightLimit, setMemberSpotlightLimit] = useState(8);
  const [shopQueryLimit, setShopQueryLimit] = useState(12);
  const [shopPreviewLimit, setShopPreviewLimit] = useState(3);
  const [postsCursor, setPostsCursor] = useState(null);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const loadMorePostsRef = useRef(null);

  const profileSignals = [
    userProfile?.city,
    userProfile?.country,
    userProfile?.childAges,
    userProfile?.bio,
  ]
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim().toLowerCase());

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [postsPage, usersData, groupsData, shopData] = await withFeedTimeout(
        Promise.all([
          getPostsPage({ limitCount: FEED_POSTS_PAGE_SIZE }),
          getDiscoverableUsers({ excludeUserId: user?.uid, limitCount: memberQueryLimit }),
          getGroups(),
          searchShopItems({ limitCount: shopQueryLimit }),
        ]),
        FEED_BOOTSTRAP_TIMEOUT_MS,
        "feed_bootstrap_timeout"
      );
      const defaultGroups = getDefaultFeedGroups(t).map(normalizeGroupRecord);
      const mergedGroupsMap = new Map(defaultGroups.map((group) => [group.id, group]));
      const builtInGroupIds = new Set(defaultGroups.map((group) => group.id));

      groupsData.forEach((group) => {
        const existingGroup = mergedGroupsMap.get(group.id) || {};
        const isBuiltInGroup = builtInGroupIds.has(group.id);
        mergedGroupsMap.set(
          group.id,
          normalizeGroupRecord({
            ...existingGroup,
            ...group,
            name: isBuiltInGroup ? (existingGroup.name || group.id) : (group.name || existingGroup.name || group.id),
            description: isBuiltInGroup ? (existingGroup.description || "") : (group.description || existingGroup.description || ""),
          })
        );
      });

      setPosts(postsPage.posts || []);
      setPostsCursor(postsPage.nextCursor || null);
      setHasMorePosts(Boolean(postsPage.hasMore));
      setMembers(usersData);
      setGroups(Array.from(mergedGroupsMap.values()));
      setShopItems(shopData);
    } catch (err) {
      console.error("Error loading posts:", err);
      const isTimeoutError = ["feed_bootstrap_timeout"].includes(err?.code);
      setPosts([]);
      setPostsCursor(null);
      setHasMorePosts(false);
      setMembers([]);
      setShopItems([]);
      setGroups(getDefaultFeedGroups(t).map(normalizeGroupRecord));
      setLoadError(isTimeoutError ? discoveryUi.loadTimeout : discoveryUi.loadError);
    } finally {
      setLoading(false);
    }
  }, [discoveryUi.loadError, discoveryUi.loadTimeout, memberQueryLimit, shopQueryLimit, t, user?.uid]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleLoadMorePosts = useCallback(async () => {
    if (loading || loadingMorePosts || !hasMorePosts || !postsCursor) {
      return;
    }

    setLoadingMorePosts(true);
    try {
      const nextPostsPage = await withFeedTimeout(
        getPostsPage({ limitCount: FEED_POSTS_PAGE_SIZE, cursor: postsCursor }),
        FEED_BOOTSTRAP_TIMEOUT_MS,
        "feed_posts_load_more_timeout"
      );

      setPosts((currentPosts) => {
        const existingIds = new Set(currentPosts.map((post) => post.id));
        const nextUniquePosts = (nextPostsPage.posts || []).filter((post) => !existingIds.has(post.id));
        return [...currentPosts, ...nextUniquePosts];
      });
      setPostsCursor(nextPostsPage.nextCursor || null);
      setHasMorePosts(Boolean(nextPostsPage.hasMore));
    } catch (error) {
      console.error("Error loading more posts:", error);
      setLoadError((previous) => previous || discoveryUi.loadError);
    } finally {
      setLoadingMorePosts(false);
    }
  }, [discoveryUi.loadError, hasMorePosts, loading, loadingMorePosts, postsCursor]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasMorePosts || loading || loadingMorePosts) {
      return;
    }

    const target = loadMorePostsRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          handleLoadMorePosts();
        }
      },
      {
        rootMargin: "300px 0px",
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [handleLoadMorePosts, hasMorePosts, loading, loadingMorePosts]);

  const filteredPosts = posts.filter((post) => {
    const s = search.toLowerCase();
    const matchesSearch =
      !s ||
      post.title?.toLowerCase().includes(s) ||
      post.body?.toLowerCase().includes(s) ||
      post.tag?.toLowerCase().includes(s);
    const matchesCity =
      cityFilter === "all" || post.location === cityFilter;
    return matchesSearch && matchesCity;
  });

  const filteredMembers = members.filter((member) => {
    const s = search.trim().toLowerCase();
    const matchesSearch = !s || [
      member.name,
      member.bio,
      member.city,
      member.country,
      member.childAges,
    ].some((value) => String(value || "").toLowerCase().includes(s));
    const matchesCity = cityFilter === "all" || String(member.city || "") === cityFilter;
    return matchesSearch && matchesCity;
  });

  const filteredGroups = groups
    .filter((group) => String(group.name || group.id || "").trim())
    .filter((group) => {
      const s = search.trim().toLowerCase();
      return !s || [group.name, group.description, group.id].some((value) => String(value || "").toLowerCase().includes(s));
    })
    .sort((a, b) => (b.membersCount || 0) - (a.membersCount || 0));
  const joinableGroups = user
    ? filteredGroups.filter((group) => !group.members?.includes(user.uid))
    : filteredGroups;

  const filteredShopItems = shopItems.filter((item) => {
    const s = search.trim().toLowerCase();
    const matchesSearch = !s || [
      item.title,
      item.description,
      item.authorName,
      item.shopName,
      item.location,
    ].some((value) => String(value || "").toLowerCase().includes(s));
    const matchesCity = cityFilter === "all" || String(item.location || "") === cityFilter;
    return matchesSearch && matchesCity;
  });

  const recommendedGroups = filteredGroups
    .filter((group) => {
      const haystack = `${group.name || ""} ${group.description || ""} ${group.id || ""}`.toLowerCase();
      return profileSignals.some((signal) => haystack.includes(signal));
    })
    .slice(0, 4);

  const nearbyMoms = members
    .filter((member) => {
      const sameCity = userProfile?.city && member.city && member.city === userProfile.city;
      const sameCountry = userProfile?.country && member.country && member.country === userProfile.country;
      return sameCity || sameCountry;
    })
    .slice(0, 4);

  const stagePosts = posts
    .filter((post) => {
      const haystack = `${post.title || ""} ${post.body || ""} ${post.tag || ""}`.toLowerCase();
      return profileSignals.some((signal) => haystack.includes(signal));
    })
    .slice(0, 3);

  const diasporaGroups = groups
    .filter((group) => `${group.name || ""} ${group.description || ""} ${group.id || ""}`.toLowerCase().includes("diaspora"))
    .slice(0, 3);
  const spotlightMembers = filteredMembers
    .slice(0, memberSpotlightLimit)
    .map((member) => ({
      ...member,
      recommendationReason: getMemberRecommendationReason(discoveryUi, member, userProfile),
    }));
  const marqueeMembers = spotlightMembers.length > 1 ? [...spotlightMembers, ...spotlightMembers] : spotlightMembers;
  const visibleShopItems = filteredShopItems.slice(0, shopPreviewLimit);
  const canLoadMoreMembers = filteredMembers.length > memberSpotlightLimit || members.length >= memberQueryLimit;
  const canLoadMoreShop = filteredShopItems.length > shopPreviewLimit || shopItems.length >= shopQueryLimit;

  function scrollToPost(postId) {
    if (!postId || typeof document === "undefined") {
      return;
    }

    const target = document.getElementById(`feed-post-${postId}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleLoadMoreMembers() {
    const nextSpotlightLimit = memberSpotlightLimit + FEED_MEMBER_SPOTLIGHT_STEP;
    setMemberSpotlightLimit(nextSpotlightLimit);

    if (nextSpotlightLimit > memberQueryLimit) {
      setMemberQueryLimit((currentLimit) => currentLimit + FEED_MEMBERS_PAGE_SIZE);
    }
  }

  function handleLoadMoreShopItems() {
    const nextPreviewLimit = shopPreviewLimit + FEED_SHOP_PREVIEW_STEP;
    setShopPreviewLimit(nextPreviewLimit);

    if (nextPreviewLimit > shopQueryLimit) {
      setShopQueryLimit((currentLimit) => currentLimit + FEED_SHOP_PAGE_SIZE);
    }
  }

  return (
    <div className="space-y-6 overflow-x-hidden sm:space-y-7">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-200 sm:h-12 sm:w-12 sm:rounded-2xl">
          <MessageCircle className="h-6 w-6 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-[1.85rem] font-semibold leading-[1.05] tracking-[-0.04em] text-slate-900 sm:text-[2.15rem]">
            {t("feedTitle")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-[0.97rem]">
            {t("feedDescription")}
          </p>
        </div>
      </div>

      <div className="grid min-w-0 gap-6 overflow-x-hidden xl:grid-cols-[260px_minmax(0,1.45fr)_230px] 2xl:grid-cols-[290px_minmax(0,1.58fr)_250px]">
        {/* Left sidebar: Profile + Trending */}
        <div className="order-2 min-w-0 space-y-6 xl:order-1">
          {user && userProfile && (
            <Card className="rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_22px_60px_-44px_rgba(15,23,42,0.3)] backdrop-blur-[2px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-[1.02rem] font-semibold tracking-[-0.01em] text-slate-900">{t("myProfile")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 ring-2 ring-rose-100">
                    {profilePhoto && <AvatarImage src={profilePhoto} />}
                    <AvatarFallback className="bg-gradient-to-br from-rose-400 to-pink-500 text-white">{getInitials(userProfile.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => window.location.href = `/profile/${user.uid}`}
                      className="truncate font-medium text-slate-900 transition-colors hover:text-rose-600"
                    >
                      {userProfile.name}
                    </button>
                    <div className="text-xs text-slate-500">
                      {userProfile.city || "Diaspora"}
                      {userProfile.childAges && ` • ${userProfile.childAges}`}
                    </div>
                  </div>
                </div>
                {userProfile.bio && (
                  <p className="text-sm leading-6 text-slate-600">{userProfile.bio}</p>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_22px_60px_-44px_rgba(15,23,42,0.3)] backdrop-blur-[2px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[1.02rem] font-semibold tracking-[-0.01em] text-slate-900">
                <MapPin className="h-4 w-4 text-rose-500" /> {discoveryUi.nearbyMoms}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {nearbyMoms.length === 0 ? (
                <p className="text-sm text-slate-500">{discoveryUi.noRecommendations}</p>
              ) : nearbyMoms.map((member) => {
                const memberPhoto = resolveProfilePhoto(
                  member.photo,
                  member.photoURL,
                  member.photoUpdatedAt || member.updatedAt
                );

                return (
                  <button
                    key={member.id}
                    onClick={() => window.location.href = `/profile/${member.id}`}
                    className="block w-full rounded-[1.45rem] border border-slate-100/90 bg-white/85 px-3.5 py-3 text-left shadow-[0_16px_38px_-34px_rgba(15,23,42,0.35)] transition hover:border-rose-100 hover:bg-rose-50/50"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-11 w-11 shrink-0 ring-2 ring-rose-100/80">
                        {memberPhoto && <AvatarImage src={memberPhoto} />}
                        <AvatarFallback className="bg-gradient-to-br from-rose-300 to-pink-500 text-white">
                          {getInitials(member.name || t("user"))}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="break-words text-[0.98rem] font-semibold leading-5 tracking-[-0.01em] text-slate-900">
                          {member.name || t("user")}
                        </div>
                        <div className="mt-1 break-words text-xs leading-5 text-slate-500">
                          {member.city || member.country || "Diaspora"}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                            {discoveryUi.nearbyBadge}
                          </Badge>
                          <span className="rounded-full border border-rose-100 bg-white px-3 py-1 text-xs font-semibold text-rose-700 shadow-sm">
                            {discoveryUi.viewProfile}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_22px_60px_-44px_rgba(15,23,42,0.3)] backdrop-blur-[2px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[1.02rem] font-semibold tracking-[-0.01em] text-slate-900">
                <Users className="h-4 w-4 text-rose-500" /> {discoveryUi.curatedGroupsTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {joinableGroups.length === 0 ? (
                <p className="text-sm text-slate-500">{discoveryUi.noGroupsMatch}</p>
              ) : joinableGroups.map((group) => (
                <button
                  type="button"
                  key={group.id}
                  onClick={() => router.push(`/groups/${group.id}`)}
                  className="block w-full rounded-[1.45rem] border border-slate-100/90 bg-white/80 px-4 py-3.5 text-left shadow-[0_16px_38px_-34px_rgba(15,23,42,0.35)] transition hover:border-sky-100 hover:bg-sky-50/60"
                >
                  <div className="min-w-0 w-full">
                    <div className="text-[0.96rem] font-semibold leading-5 tracking-[-0.01em] text-slate-900">{group.name || group.id}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      {group.description || `${group.membersCount || 0} ${t("members")}`}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 sm:justify-between">
                    <Badge variant="secondary" className="inline-flex max-w-full rounded-full whitespace-normal bg-slate-100 text-left text-slate-700">
                      {group.membersCount || 0} {t("members")}
                    </Badge>
                    <span className="rounded-full border border-sky-100 bg-white px-3 py-1 text-xs font-semibold text-sky-700 shadow-sm">
                      {discoveryUi.viewGroup}
                    </span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main content: Posts + Post form */}
        <div className="order-1 min-w-0 space-y-6 xl:order-2">
          <Card className="rounded-[2.15rem] border border-rose-100/60 bg-white/95 shadow-[0_25px_80px_-42px_rgba(15,23,42,0.2)]">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="flex items-center gap-2 text-[1.02rem] font-semibold tracking-[-0.01em]">
                <Sparkles className="h-4 w-4 text-rose-500" /> {discoveryUi.discoveryTitle}
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-500">{discoveryUi.discoveryDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="overflow-hidden rounded-[2.15rem] border border-rose-100/80 bg-[radial-gradient(circle_at_top_left,_rgba(251,207,232,0.4),_transparent_35%),linear-gradient(135deg,rgba(255,241,242,0.95),rgba(255,255,255,0.98)_48%,rgba(253,242,248,0.96))] p-4 shadow-[0_24px_80px_-36px_rgba(190,24,93,0.32)] sm:p-6">
                <div className="space-y-6">
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-700 shadow-sm">
                      <Sparkles className="h-3.5 w-3.5" /> {discoveryUi.heroEyebrow}
                    </div>

                    <div className="space-y-2">
                      <h2 className="font-display max-w-3xl text-[1.95rem] font-semibold leading-[1.02] tracking-[-0.05em] text-slate-900 sm:text-[2.25rem] sm:leading-[1.04]">
                        {discoveryUi.heroHeadline}
                      </h2>
                      <p className="max-w-2xl text-[0.96rem] leading-7 text-slate-600 sm:text-[1rem]">
                        {discoveryUi.heroBody}
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder={discoveryUi.searchMembersGroupsShop}
                          className="h-12 rounded-2xl border-white/70 bg-white/85 pl-9 shadow-sm"
                        />
                      </div>
                      <Select value={cityFilter} onValueChange={setCityFilter}>
                        <SelectTrigger className="h-12 rounded-2xl border-white/70 bg-white/85 shadow-sm">
                          <SelectValue placeholder={t("city")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("allCities")}</SelectItem>
                          {cities.slice(1).map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {t("trendingTopics")}
                      </span>
                      {trendingTopics.map((topic) => (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => setSearch(topic)}
                          className="rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-rose-200 hover:bg-white hover:text-rose-700"
                        >
                          #{topic}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div className="inline-flex items-center rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                        {filteredPosts.length + filteredMembers.length + filteredGroups.length + filteredShopItems.length} {discoveryUi.allResults.toLowerCase()}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[1.35rem] border border-white/70 bg-white/78 p-3.5 shadow-sm">
                          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{discoveryUi.membersResults}</div>
                          <div className="mt-1.5 text-xl font-semibold text-slate-900">{filteredMembers.length}</div>
                        </div>
                        <div className="rounded-[1.35rem] border border-white/70 bg-white/78 p-3.5 shadow-sm">
                          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{discoveryUi.groupsResults}</div>
                          <div className="mt-1.5 text-xl font-semibold text-slate-900">{filteredGroups.length}</div>
                        </div>
                        <div className="rounded-[1.35rem] border border-white/70 bg-white/78 p-3.5 shadow-sm">
                          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{discoveryUi.shopResults}</div>
                          <div className="mt-1.5 text-xl font-semibold text-slate-900">{filteredShopItems.length}</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <UserRound className="h-4 w-4 text-rose-500" /> {discoveryUi.memberSpotlight}
                      </div>

                      {spotlightMembers.length === 0 ? (
                        <div className="rounded-[1.75rem] border border-dashed border-white/80 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
                          {discoveryUi.noMembersMatch}
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3 sm:hidden">
                            {spotlightMembers.map((member) => (
                              <SpotlightMemberCard
                                key={member.id}
                                member={member}
                                t={t}
                                discoveryUi={discoveryUi}
                                compact
                                onClick={() => router.push(`/profile/${member.id}`)}
                              />
                            ))}
                          </div>
                          <div className="relative hidden overflow-hidden rounded-[1.9rem] border border-white/70 bg-white/80 p-3 shadow-sm sm:block">
                            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white via-white/80 to-transparent" />
                            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white via-white/80 to-transparent" />
                            <div className="feed-member-marquee">
                              <div className="feed-member-track">
                                {marqueeMembers.map((member, index) => (
                                  <SpotlightMemberCard
                                    key={`${member.id}-${index}`}
                                    member={member}
                                    t={t}
                                    discoveryUi={discoveryUi}
                                    onClick={() => router.push(`/profile/${member.id}`)}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {canLoadMoreMembers ? (
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-2xl"
                            onClick={handleLoadMoreMembers}
                            disabled={loading}
                          >
                            {loading ? discoveryUi.loadingMore : discoveryUi.loadMoreMembers}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <PostForm onPostCreated={loadPosts} collapsible />

          <Card className="rounded-[2rem] border border-slate-200/70 bg-white/95 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.3)]">
            <CardContent className="p-4 sm:p-5">
              {loadError ? (
                <div className="mb-4 rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {loadError}
                </div>
              ) : null}

              {loading ? (
                <div className="py-12 text-center text-slate-500">{t("loadingPosts")}</div>
              ) : filteredPosts.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  {t("noPosts")}
                </div>
              ) : (
                <div className="space-y-5">
                  {filteredPosts.map((post) => (
                    <div key={post.id} id={`feed-post-${post.id}`}>
                      <PostCard post={post} />
                    </div>
                  ))}

                  {hasMorePosts ? (
                    <div ref={loadMorePostsRef} className="flex justify-center pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-2xl"
                        onClick={handleLoadMorePosts}
                        disabled={loadingMorePosts}
                      >
                        {loadingMorePosts ? discoveryUi.loadingMore : discoveryUi.loadMorePosts}
                      </Button>
                    </div>
                  ) : posts.length > 0 ? (
                    <div className="pt-2 text-center text-sm text-slate-400">
                      {discoveryUi.endOfFeed}
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="order-3 min-w-0 space-y-6">
          <Card className="rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_22px_60px_-44px_rgba(15,23,42,0.3)] backdrop-blur-[2px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[1.02rem] font-semibold tracking-[-0.01em] text-slate-900">
                <Sparkles className="h-4 w-4 text-rose-500" /> {discoveryUi.recommendedForYou}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{discoveryUi.stageContent}</div>
                <div className="space-y-2">
                  {stagePosts.length === 0 ? (
                    <p className="text-sm text-slate-500">{discoveryUi.noRecommendations}</p>
                  ) : stagePosts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => scrollToPost(post.id)}
                      className="block w-full rounded-[1.45rem] border border-slate-100/90 bg-white/80 px-3.5 py-3 text-left shadow-[0_16px_38px_-34px_rgba(15,23,42,0.35)] transition hover:border-rose-100 hover:bg-rose-50/50"
                    >
                      <div className="text-[0.96rem] font-semibold leading-5 tracking-[-0.01em] text-slate-800">{post.title || t("feedTitle")}</div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 sm:justify-between">
                        <div className="text-xs leading-5 text-slate-500">{getTagLabel(post.tag, t) || discoveryUi.childAgeBadge}</div>
                        <span className="rounded-full border border-rose-100 bg-white px-3 py-1 text-xs font-semibold text-rose-700 shadow-sm">
                          {discoveryUi.openPost}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{discoveryUi.diasporaGroups}</div>
                <div className="space-y-2">
                  {diasporaGroups.length === 0 ? (
                    <p className="text-sm text-slate-500">{discoveryUi.noRecommendations}</p>
                  ) : diasporaGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => window.location.href = `/groups/${group.id}`}
                      className="flex w-full flex-col items-stretch gap-3 rounded-[1.45rem] border border-slate-100/90 bg-white/80 px-3.5 py-3 text-left shadow-[0_16px_38px_-34px_rgba(15,23,42,0.35)] transition hover:border-rose-100 hover:bg-rose-50/50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="w-full text-[0.96rem] font-semibold leading-5 tracking-[-0.01em] text-slate-800">{group.name}</span>
                      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                        <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-600">{discoveryUi.diasporaBadge}</Badge>
                        <span className="rounded-full border border-rose-100 bg-white px-3 py-1 text-xs font-semibold text-rose-700 shadow-sm">
                          {discoveryUi.viewGroup}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border border-rose-100/70 bg-gradient-to-br from-rose-50 via-white to-pink-50 shadow-[0_22px_60px_-44px_rgba(190,24,93,0.28)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-[1.02rem] font-semibold tracking-[-0.01em] text-slate-900">{t("dailyQuestion")}</CardTitle>
              <CardDescription>{t("dailyQuestionDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl bg-white/80 p-4 text-sm text-slate-700 shadow-sm">
                <div className="font-medium">{discoveryUi.dailyQuestionPrompt}</div>
                <p className="mt-2 text-slate-500">
                  {discoveryUi.dailyQuestionBody}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_22px_60px_-44px_rgba(15,23,42,0.3)] backdrop-blur-[2px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[1.02rem] font-semibold tracking-[-0.01em] text-slate-900">
                <ShoppingBag className="h-4 w-4 text-amber-500" /> {discoveryUi.curatedShopTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {visibleShopItems.length === 0 ? (
                <p className="text-sm text-slate-500">{discoveryUi.noShopMatch}</p>
              ) : visibleShopItems.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => router.push("/boutique")}
                  className="flex w-full flex-col items-stretch gap-3 rounded-[1.45rem] border border-slate-100/90 bg-white/80 px-4 py-3.5 text-left shadow-[0_16px_38px_-34px_rgba(15,23,42,0.35)] transition hover:border-amber-100 hover:bg-amber-50/60 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 w-full">
                    <div className="text-[0.96rem] font-semibold leading-5 tracking-[-0.01em] text-slate-900">{item.title}</div>
                    <div className="mt-1 break-words text-xs leading-5 text-slate-500">
                      {item.location || "Diaspora"} • {item.shopName || item.authorName || "Lakou Manman"}
                    </div>
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-col sm:items-end">
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm">
                      {Number(item.price || 0).toFixed(2)} HTG
                    </div>
                    <span className="rounded-full border border-amber-100 bg-white px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm">
                      {discoveryUi.openBoutique}
                    </span>
                  </div>
                </button>
              ))}

              {canLoadMoreShop ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-2xl"
                  onClick={handleLoadMoreShopItems}
                  disabled={loading}
                >
                  {loading ? discoveryUi.loadingMore : discoveryUi.loadMoreShop}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

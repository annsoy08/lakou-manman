"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getPosts, getDiscoverableUsers, getGroups, searchShopItems } from "@/lib/firestore";
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
  Filter,
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

const FEED_BOOTSTRAP_TIMEOUT_MS = 12000;
const FEED_MEMBERS_PAGE_SIZE = 24;
const FEED_MEMBER_SPOTLIGHT_STEP = 8;
const FEED_SHOP_PAGE_SIZE = 12;
const FEED_SHOP_PREVIEW_STEP = 3;

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
        nearbyMoms: "Manman ki pre w",
        stageContent: "Kontni pou etap ou",
        diasporaGroups: "Gwoup diaspora yo",
        noMembersMatch: "Pa gen manm ki koresponn ak rechèch la.",
        noGroupsMatch: "Pa gen gwoup ki koresponn ak rechèch la.",
        noShopMatch: "Pa gen atik boutik ki koresponn ak rechèch la.",
        noRecommendations: "Nou poko jwenn rekòmandasyon pèsonalize.",
        viewProfile: "Wè pwofil",
        viewGroups: "Wè gwoup yo",
        openBoutique: "Louvri boutik la",
        openPost: "Li post la",
        memberSince: "Manm",
        relevantGroup: "Gwoup ki enpòtan",
        nearbyBadge: "Toupre",
        diasporaBadge: "Diaspora",
        childAgeBadge: "Laj timoun",
        cityBadge: "Vil",
        searchMembersGroupsShop: "Chèche manm, gwoup, posts oswa boutik",
        heroEyebrow: "Seleksyon premium Lakou Manman",
        heroHeadline: "Dekouvri manman, gwoup ak bon plan ki vrèman sanble avè w.",
        heroBody: "Yon espas pi elegant pou jwenn pwofil aktif, kominote itil ak atik boutique ki matche ak lavi ou jodi a.",
        memberSpotlight: "Manman pou dekouvri",
        memberCarouselHint: "Glise otomatikman · kanpe lè sourit la pase",
        curatedGroupsTitle: "Gwoup pou rantre ladan yo",
        curatedShopTitle: "Boutique coup de cœur",
        premiumSelection: "Pou ou",
        discoverMember: "Dekouvri",
        dailyQuestionPrompt: "Ki pi gwo defi w kòm manman semèn sa a?",
        dailyQuestionBody: "Dòmi tibebe, manje, fatig, tan pou tèt ou, oswa òganizasyon lakay?",
        loadError: "Nou pa t ka chaje feed la kounye a.",
        loadTimeout: "Chajman feed la pran twòp tan. Verifye koneksyon an epi eseye ankò.",
        loadMoreMembers: "Chaje plis manm",
        loadMoreShop: "Chaje plis atik",
        loadingMore: "Chajman an ap kontinye...",
      }
    : {
        discoveryTitle: "Mieux découvrir",
        discoveryDescription: "Trouvez les membres, groupes, publications et articles boutique les plus utiles pour vous.",
        allResults: "Tous les résultats",
        membersResults: "Membres",
        groupsResults: "Groupes",
        shopResults: "Boutique",
        recommendedForYou: "Recommandé pour vous",
        nearbyMoms: "Mamans proches",
        stageContent: "Contenus pour votre étape",
        diasporaGroups: "Groupes diaspora",
        noMembersMatch: "Aucun membre ne correspond à la recherche.",
        noGroupsMatch: "Aucun groupe ne correspond à la recherche.",
        noShopMatch: "Aucun article boutique ne correspond à la recherche.",
        noRecommendations: "Aucune recommandation personnalisée pour le moment.",
        viewProfile: "Voir le profil",
        viewGroups: "Voir les groupes",
        openBoutique: "Ouvrir la boutique",
        openPost: "Lire le post",
        memberSince: "Membre",
        relevantGroup: "Groupe pertinent",
        nearbyBadge: "Proche",
        diasporaBadge: "Diaspora",
        childAgeBadge: "Âge enfant",
        cityBadge: "Ville",
        searchMembersGroupsShop: "Rechercher membres, groupes, posts ou boutique",
        heroEyebrow: "Sélection premium Lakou Manman",
        heroHeadline: "Découvrez des mamans, groupes et trouvailles qui vous ressemblent vraiment.",
        heroBody: "Un espace plus premium pour repérer rapidement les profils actifs, les communautés utiles et les articles boutique adaptés à votre quotidien.",
        memberSpotlight: "Mamans à découvrir",
        memberCarouselHint: "Défilement automatique · pause au survol",
        curatedGroupsTitle: "Groupes à rejoindre",
        curatedShopTitle: "Boutique coup de cœur",
        premiumSelection: "Pour vous",
        discoverMember: "Découvrir",
        dailyQuestionPrompt: "Quel est votre plus grand défi de maman cette semaine ?",
        dailyQuestionBody: "Sommeil du bébé, repas, fatigue, temps pour vous ou organisation de la maison ?",
        loadError: "Le feed n'a pas pu être chargé pour le moment.",
        loadTimeout: "Le chargement du feed a dépassé le délai prévu. Vérifiez la connexion puis réessayez.",
        loadMoreMembers: "Charger plus de membres",
        loadMoreShop: "Charger plus d'articles",
        loadingMore: "Chargement en cours...",
      };
  
  const trendingTopics = getTrendingTopics(language);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [memberQueryLimit, setMemberQueryLimit] = useState(48);
  const [memberSpotlightLimit, setMemberSpotlightLimit] = useState(8);
  const [shopQueryLimit, setShopQueryLimit] = useState(12);
  const [shopPreviewLimit, setShopPreviewLimit] = useState(3);

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
      const [postsData, usersData, groupsData, shopData] = await withFeedTimeout(
        Promise.all([
          getPosts(),
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

      setPosts(postsData);
      setMembers(usersData);
      setGroups(Array.from(mergedGroupsMap.values()));
      setShopItems(shopData);
    } catch (err) {
      console.error("Error loading posts:", err);
      const isTimeoutError = ["feed_bootstrap_timeout"].includes(err?.code);
      setPosts([]);
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
  const activeGroups = (recommendedGroups.length > 0 ? recommendedGroups : filteredGroups).slice(0, 6);
  const spotlightMembers = filteredMembers.slice(0, memberSpotlightLimit);
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
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-200">
          <MessageCircle className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t("feedTitle")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("feedDescription")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1.4fr)_260px] 2xl:grid-cols-[240px_minmax(0,1.55fr)_280px]">
        {/* Left sidebar: Profile + Trending */}
        <div className="space-y-6">
          {user && userProfile && (
            <Card className="rounded-[2rem] border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t("myProfile")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 ring-2 ring-rose-100">
                    {profilePhoto && <AvatarImage src={profilePhoto} />}
                    <AvatarFallback className="bg-gradient-to-br from-rose-400 to-pink-500 text-white">{getInitials(userProfile.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <button
                      onClick={() => window.location.href = `/profile/${user.uid}`}
                      className="font-medium text-slate-900 hover:text-rose-600 transition-colors"
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

          <Card className="rounded-[2rem] border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-4 w-4 text-rose-500" /> {discoveryUi.nearbyMoms}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {nearbyMoms.length === 0 ? (
                <p className="text-sm text-slate-500">{discoveryUi.noRecommendations}</p>
              ) : nearbyMoms.map((member) => (
                <button
                  key={member.id}
                  onClick={() => window.location.href = `/profile/${member.id}`}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-100 px-3 py-2 text-left transition hover:border-rose-100 hover:bg-rose-50/50"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-800">{member.name || t("user")}</div>
                    <div className="text-xs text-slate-500">{member.city || member.country || "Diaspora"}</div>
                  </div>
                  <Badge variant="secondary" className="rounded-full">{discoveryUi.nearbyBadge}</Badge>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-0 bg-gradient-to-br from-rose-50 to-pink-50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-4 w-4 text-rose-500" /> {t("trendingTopics")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {trendingTopics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSearch(topic)}
                  className="block w-full rounded-2xl bg-white/80 px-3 py-2.5 text-left text-sm text-slate-700 transition-all hover:bg-white hover:shadow-sm hover:translate-x-1"
                >
                  <span className="text-rose-400">#</span> {topic}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
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
                  className="flex w-full items-start justify-between gap-3 rounded-[1.35rem] border border-slate-100 bg-slate-50/80 px-4 py-3 text-left transition hover:border-sky-100 hover:bg-sky-50/60"
                >
                  <div className="min-w-0">
                    <div className="break-words font-medium text-slate-900">{group.name || group.id}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      {group.description || `${group.membersCount || 0} ${t("members")}`}
                    </div>
                  </div>
                  <Badge variant="secondary" className="rounded-full whitespace-nowrap bg-white text-slate-700">
                    {group.membersCount || 0} {t("members")}
                  </Badge>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main content: Posts + Post form */}
        <div className="space-y-6">
          <Card className="rounded-[2rem] border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-4 w-4 text-rose-500" /> {discoveryUi.discoveryTitle}
              </CardTitle>
              <CardDescription>{discoveryUi.discoveryDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="overflow-hidden rounded-[2rem] border border-rose-100/80 bg-[radial-gradient(circle_at_top_left,_rgba(251,207,232,0.4),_transparent_35%),linear-gradient(135deg,rgba(255,241,242,0.95),rgba(255,255,255,0.98)_48%,rgba(253,242,248,0.96))] p-4 shadow-[0_20px_70px_-35px_rgba(190,24,93,0.35)] sm:p-5">
                <div className="space-y-5">
                  <div className="space-y-5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 shadow-sm">
                      <Sparkles className="h-3.5 w-3.5" /> {discoveryUi.heroEyebrow}
                    </div>

                    <div className="space-y-2">
                      <h2 className="max-w-3xl text-2xl font-semibold tracking-tight text-slate-900 sm:text-[2rem] sm:leading-tight">
                        {discoveryUi.heroHeadline}
                      </h2>
                      <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-[0.95rem]">
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
                          className="rounded-2xl border-white/70 bg-white/85 pl-9 shadow-sm"
                        />
                      </div>
                      <Select value={cityFilter} onValueChange={setCityFilter}>
                        <SelectTrigger className="rounded-2xl border-white/70 bg-white/85 shadow-sm">
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

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-4 shadow-sm">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{discoveryUi.allResults}</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-900">{filteredPosts.length + filteredMembers.length + filteredGroups.length + filteredShopItems.length}</div>
                      </div>
                      <div className="rounded-[1.5rem] border border-sky-100/70 bg-sky-50/85 p-4 shadow-sm">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{discoveryUi.membersResults}</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-900">{filteredMembers.length}</div>
                      </div>
                      <div className="rounded-[1.5rem] border border-violet-100/70 bg-violet-50/85 p-4 shadow-sm">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{discoveryUi.groupsResults}</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-900">{filteredGroups.length}</div>
                      </div>
                      <div className="rounded-[1.5rem] border border-amber-100/70 bg-amber-50/85 p-4 shadow-sm">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{discoveryUi.shopResults}</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-900">{filteredShopItems.length}</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <UserRound className="h-4 w-4 text-rose-500" /> {discoveryUi.memberSpotlight}
                        </div>
                        <Badge variant="secondary" className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-600">
                          {discoveryUi.memberCarouselHint}
                        </Badge>
                      </div>

                      {spotlightMembers.length === 0 ? (
                        <div className="rounded-[1.75rem] border border-dashed border-white/80 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
                          {discoveryUi.noMembersMatch}
                        </div>
                      ) : (
                        <div className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/80 p-3 shadow-sm">
                          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white via-white/80 to-transparent" />
                          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white via-white/80 to-transparent" />
                          <div className="feed-member-marquee">
                            <div className="feed-member-track">
                              {marqueeMembers.map((member, index) => {
                                const memberPhoto = resolveProfilePhoto(
                                  member.photo,
                                  member.photoURL,
                                  member.photoUpdatedAt || member.updatedAt
                                );

                                return (
                                  <button
                                    type="button"
                                    key={`${member.id}-${index}`}
                                    onClick={() => router.push(`/profile/${member.id}`)}
                                    className="card-hover group w-[240px] shrink-0 rounded-[1.5rem] border border-rose-100/80 bg-gradient-to-br from-white via-white to-rose-50/80 p-4 text-left shadow-sm"
                                  >
                                    <div className="flex items-start gap-3">
                                      <Avatar className="h-14 w-14 ring-2 ring-rose-100">
                                        {memberPhoto && <AvatarImage src={memberPhoto} />}
                                        <AvatarFallback className="bg-gradient-to-br from-rose-400 to-pink-500 text-white">
                                          {getInitials(member.name || t("user"))}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0 flex-1">
                                        <div className="truncate text-base font-semibold text-slate-900">
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

                                    <div className="mt-4 flex items-center justify-between text-sm font-medium text-rose-700 transition group-hover:text-rose-800">
                                      <span>{discoveryUi.discoverMember}</span>
                                      <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs">{discoveryUi.viewProfile}</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
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

          <Card className="rounded-[2rem] border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    className="rounded-2xl pl-9"
                  />
                </div>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="rounded-2xl">
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
                <div className="space-y-4">
                  {filteredPosts.map((post) => (
                    <div key={post.id} id={`feed-post-${post.id}`}>
                      <PostCard post={post} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <PostForm onPostCreated={loadPosts} />
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          <Card className="rounded-[2rem] border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
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
                      className="block w-full rounded-2xl border border-slate-100 px-3 py-2 text-left transition hover:border-rose-100 hover:bg-rose-50/50"
                    >
                      <div className="text-sm font-medium text-slate-800">{post.title || t("feedTitle")}</div>
                      <div className="mt-1 text-xs text-slate-500">{getTagLabel(post.tag, t) || discoveryUi.childAgeBadge}</div>
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
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-100 px-3 py-2 text-left transition hover:border-rose-100 hover:bg-rose-50/50"
                    >
                      <span className="text-sm font-medium text-slate-800">{group.name}</span>
                      <Badge variant="secondary" className="rounded-full">{discoveryUi.diasporaBadge}</Badge>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-0 bg-gradient-to-br from-rose-50 to-pink-50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t("dailyQuestion")}</CardTitle>
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

          <Card className="rounded-[2rem] border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-4 w-4 text-rose-500" /> {t("activeGroups")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => window.location.href = `/groups/${group.id}`}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-100 px-3 py-2.5 text-left text-sm text-slate-700 transition-all hover:bg-rose-50/50 hover:border-rose-100 hover:shadow-sm"
                >
                  <span className="min-w-0 flex-1 pr-2">
                    <span className="block break-words font-medium text-slate-800">{group.name || group.id}</span>
                    <span className="block text-xs text-slate-500">{group.membersCount || 0} {t("members")}</span>
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    {recommendedGroups.some((recommendedGroup) => recommendedGroup.id === group.id) && (
                      <Badge variant="secondary" className="rounded-full">{discoveryUi.relevantGroup}</Badge>
                    )}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
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
                  className="flex w-full items-start justify-between gap-3 rounded-[1.35rem] border border-slate-100 bg-slate-50/80 px-4 py-3 text-left transition hover:border-amber-100 hover:bg-amber-50/60"
                >
                  <div className="min-w-0">
                    <div className="break-words font-medium text-slate-900">{item.title}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      {item.location || "Diaspora"} • {item.shopName || item.authorName || "Lakou Manman"}
                    </div>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm">
                    {Number(item.price || 0).toFixed(2)} HTG
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

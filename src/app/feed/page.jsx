"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getPosts, getComments } from "@/lib/firestore";
import PostCard from "@/components/posts/PostCard";
import PostForm from "@/components/posts/PostForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";
import {
  Search,
  MessageCircle,
  Filter,
  Users,
} from "lucide-react";

const getTrendingTopics = (t) => [
  t("tagSleep"),
  t("tagFeeding"),
  t("tagPostpartum"),
  t("tagCreole"),
  t("tagWorkKids"),
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

export default function FeedPage() {
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const trendingTopics = getTrendingTopics(t);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPosts();
      setPosts(data);
    } catch (err) {
      console.error("Error loading posts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

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

      <div className="grid gap-6 xl:grid-cols-[260px_1fr_280px]">
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
                    {userProfile.photo && <AvatarImage src={userProfile.photo} />}
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
        </div>

        {/* Main content: Post form + Posts */}
        <div className="space-y-6">
          <PostForm onPostCreated={loadPosts} />

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

              {loading ? (
                <div className="py-12 text-center text-slate-500">{t("loadingPosts")}</div>
              ) : filteredPosts.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  {t("noPosts")}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          <Card className="rounded-[2rem] border-0 bg-gradient-to-br from-rose-50 to-pink-50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t("dailyQuestion")}</CardTitle>
              <CardDescription>{t("dailyQuestionDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl bg-white/80 p-4 text-sm text-slate-700 shadow-sm">
                <div className="font-medium">Ki pi gwo defi w kòm manman semèn sa a?</div>
                <p className="mt-2 text-slate-500">
                  Sommeil tibebe, manje, fatig, tan pou tèt ou, oswa òganizasyon lakay?
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
              {[
    { key: "groupNewborn", label: t("groupNewborn") },
    { key: "groupPostpartum", label: t("groupPostpartum") },
    { key: "groupDiaspora", label: t("groupDiaspora") },
    { key: "groupFeeding", label: t("groupFeeding") },
    { key: "groupWorkFamily", label: t("groupWorkFamily") },
    { key: "groupGriefLoss", label: t("groupGriefLoss") }
  ].map((group) => (
                <div
                  key={group.key}
                  className="rounded-2xl border border-slate-100 px-3 py-2.5 text-sm text-slate-700 transition-all hover:bg-rose-50/50 hover:border-rose-100 hover:shadow-sm cursor-pointer"
                >
                  {group.label}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getGroup, getGroupPosts, joinGroup, leaveGroup, createConversation } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter } from "next/navigation";
import PostCard from "@/components/posts/PostCard";
import PostForm from "@/components/posts/PostForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { ArrowLeft, Users, MessageCircle, UserPlus, UserMinus } from "lucide-react";

export default function GroupDetailPage() {
  const params = useParams();
  const { t } = useLanguage();
  const groupId = params.id;

  // Function to get group name from ID
  const getGroupName = (id) => {
    const groupNames = {
      "nouveau-ne": t("groupNewborn"),
      "post-partum": t("groupPostpartum"),
      "diaspora": t("groupDiaspora"),
      "alimentation": t("groupFeeding"),
      "travay-fanmi": t("groupWorkFamily"),
      "deuil-perte": t("groupGriefLoss")
    };
    return groupNames[id] || id;
  };
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [groupData, postsData] = await Promise.all([
        getGroup(groupId),
        getPosts({ groupId }),
      ]);
      setGroup(groupData);
      setPosts(postsData);
    } catch (err) {
      console.error("Error loading group:", err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <div className="py-12 text-center text-slate-500">{t("loadingGroup")}...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-white/70 p-3 shadow-sm">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {group?.name || getGroupName(groupId)}
            </h1>
            {group?.membersCount && (
              <Badge variant="secondary" className="rounded-full">
                {group?.membersCount} {t("members")}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {group?.description || t("groupDefaultDescription")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <PostForm
            groupId={groupId}
            groupName={group?.name || getGroupName(groupId)}
            onPostCreated={loadData}
          />

          {posts.length === 0 ? (
            <Card className="rounded-[2rem]">
              <CardContent className="py-12 text-center text-slate-500">
                {t("noPostsInGroup")}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardTitle className="text-lg">{t("groupInformation")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="font-medium text-slate-900">{t("members")}</div>
                <div>{group?.membersCount || 0} {t("mothers")}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="font-medium text-slate-900">{t("posts")}</div>
                <div>{posts.length} {t("discussions")}</div>
              </div>
            </CardContent>
          </Card>

          {/* Group Members Section */}
          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t("activeMembers")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Sample members - in real app, fetch from database */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600 text-sm">
                        MJ
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">Marie Jean</div>
                      <div className="text-xs text-slate-500">Port-au-Prince</div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-xl text-xs">
                    <MessageCircle className="h-3 w-3 mr-1" />
                    {t("contact")}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600 text-sm">
                        PD
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">Pauline Dumont</div>
                      <div className="text-xs text-slate-500">Delmas 32</div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-xl text-xs">
                    <MessageCircle className="h-3 w-3 mr-1" />
                    {t("contact")}
                  </Button>
                </div>
              </div>
              
              <div className="text-center pt-2">
                <Button variant="ghost" size="sm" className="text-xs text-slate-500">
                  {t("viewAllMembers")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

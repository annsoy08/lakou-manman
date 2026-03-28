"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createConversation, getGroup, getGroupMembers, getPosts, joinGroup, leaveGroup } from "@/lib/firestore";
import { getInitials } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import PostCard from "@/components/posts/PostCard";
import PostForm from "@/components/posts/PostForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, MessageCircle, Link2, Pin, Shield, UserPlus } from "lucide-react";

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

function normalizeGroupRecord(group = null) {
  if (!group) {
    return null;
  }

  const members = getGroupMemberIds(group);

  return {
    ...group,
    members,
    membersCount: members.length,
  };
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const groupId = params.id;
  const getGroupName = (id) => {
    const groupNames = {
      "nouveau-ne": t("groupNewborn"),
      "enfants": t("groupChildren"),
      "adolescents": t("groupTeens"),
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
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [conversationLoadingId, setConversationLoadingId] = useState("");
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState("");

  const pinnedPosts = useMemo(
    () => posts.filter((post) => post?.pinned || post?.isPinned),
    [posts]
  );

  const visibleMembers = showAllMembers ? members : members.slice(0, 4);

  const groupRules = [
    t("groupRuleRespect"),
    t("groupRuleKindness"),
    t("groupRulePrivacy"),
    t("groupRuleMedical"),
  ];

  const isMember = Boolean(user?.uid && group?.members?.includes(user.uid));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const groupData = normalizeGroupRecord(await getGroup(groupId).catch(() => null));
      const postsData = await getPosts({ groupId }).catch(() => []);
      const membersData = await getGroupMembers(groupData).catch(() => []);
      setGroup(groupData);
      setPosts(postsData || []);
      setMembers(membersData || []);
    } catch (err) {
      console.error("Error loading group:", err);
      setGroup(null);
      setPosts([]);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleMembershipChange(nextAction) {
    if (!user?.uid) {
      return;
    }

    setMembershipLoading(true);
    try {
      if (nextAction === "join") {
        await joinGroup(groupId, user.uid);
      } else {
        await leaveGroup(groupId, user.uid);
      }

      await loadData();
    } catch (err) {
      console.error("Error updating membership:", err);
    } finally {
      setMembershipLoading(false);
    }
  }

  async function handleContactMember(memberId) {
    if (!user?.uid || !memberId || memberId === user.uid) {
      return;
    }

    setConversationLoadingId(memberId);
    try {
      const conversationId = await createConversation([user.uid, memberId]);
      router.push(`/messages?conversationId=${conversationId}`);
    } catch (err) {
      console.error("Error opening member conversation:", err);
    } finally {
      setConversationLoadingId("");
    }
  }

  async function handleCopyInviteLink() {
    if (typeof window === "undefined") {
      return;
    }

    const inviteLink = `${window.location.origin}/groups/${groupId}`;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteFeedback(t("inviteLinkCopied"));
    } catch (err) {
      console.error("Error copying invite link:", err);
      setInviteFeedback(t("inviteLinkCopyError"));
    }
  }

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
            {typeof group?.membersCount === "number" && (
              <Badge variant="secondary" className="rounded-full">
                {group?.membersCount} {t("members")}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {group?.description || t("groupDefaultDescription")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {isMember ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl"
                onClick={() => handleMembershipChange("leave")}
                disabled={membershipLoading}
              >
                {membershipLoading ? t("leavingGroup") : t("leaveGroup")}
              </Button>
            ) : (
              <Button
                type="button"
                className="rounded-2xl"
                onClick={() => handleMembershipChange("join")}
                disabled={!user || membershipLoading}
              >
                {membershipLoading ? t("joiningGroup") : t("joinGroup")}
              </Button>
            )}
            <Button type="button" variant="outline" className="rounded-2xl" onClick={handleCopyInviteLink}>
              <UserPlus className="mr-2 h-4 w-4" />
              {t("inviteMembers")}
            </Button>
          </div>
          {inviteFeedback ? (
            <p className="mt-2 text-xs text-slate-500">{inviteFeedback}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Pin className="h-5 w-5" />
                {t("pinnedPosts")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              {pinnedPosts.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-3">{t("noPinnedPosts")}</div>
              ) : (
                pinnedPosts.map((post) => (
                  <div key={post.id} className="rounded-xl bg-slate-50 p-3">
                    <div className="font-medium text-slate-900 line-clamp-2">
                      {post.title || post.content || t("pinnedPosts")}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

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

          <PostForm
            groupId={groupId}
            groupName={group?.name || getGroupName(groupId)}
            onPostCreated={loadData}
          />
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardTitle className="text-lg">{t("groupInformation")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="font-medium text-slate-900">{t("members")}</div>
                <div>{group?.membersCount || 0} {t("members")}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="font-medium text-slate-900">{t("posts")}</div>
                <div>{posts.length} {t("discussions")}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="font-medium text-slate-900">{t("groupAdmin")}</div>
                <div>{members.filter((member) => member.role === "admin").length} {t("members")}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t("activeMembers")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {visibleMembers.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                  {t("noMembersYet")}
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-slate-50">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.photo} alt={member.name} />
                          <AvatarFallback className="bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600 text-sm">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium truncate">{member.name}</div>
                            <Badge variant="secondary" className="rounded-full text-[10px] capitalize">
                              {t(member.role)}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {member.location || t("member")}
                          </div>
                        </div>
                      </div>
                      {member.id !== user?.uid ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-xs"
                          onClick={() => handleContactMember(member.id)}
                          disabled={conversationLoadingId === member.id || !user}
                        >
                          <MessageCircle className="h-3 w-3 mr-1" />
                          {conversationLoadingId === member.id ? t("openingConversation") : t("contactMember")}
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {members.length > 4 ? (
                <div className="text-center pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-500"
                    onClick={() => setShowAllMembers((current) => !current)}
                  >
                    {showAllMembers ? t("viewLessMembers") : t("viewAllMembers")}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t("groupRules")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              {groupRules.map((rule) => (
                <div key={rule} className="rounded-xl bg-slate-50 p-3">
                  {rule}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                {t("inviteMembers")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="rounded-xl bg-slate-50 p-3 break-all">
                {typeof window !== "undefined" ? `${window.location.origin}/groups/${groupId}` : `/groups/${groupId}`}
              </div>
              <Button type="button" variant="outline" className="w-full rounded-2xl" onClick={handleCopyInviteLink}>
                {t("copyInviteLink")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

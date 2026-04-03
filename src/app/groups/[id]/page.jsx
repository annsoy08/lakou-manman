"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getGroup, getGroupMembers, getPost, getPosts, joinGroup, leaveGroup } from "@/lib/firestore";
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
        ...(Array.isArray(group?.members) ? group.members : []),
        ...(Array.isArray(group?.adminIds) ? group.adminIds : []),
        ...(Array.isArray(group?.moderatorIds) ? group.moderatorIds : []),
        typeof group?.ownerId === "string" ? group.ownerId : "",
        typeof group?.createdBy === "string" ? group.createdBy : "",
      ].filter((value) => typeof value === "string" && value.trim())
    )
  );
}

function getGroupManagerIds(group = {}) {
  return Array.from(
    new Set(
      [
        ...(Array.isArray(group?.adminIds) ? group.adminIds : []),
        ...(Array.isArray(group?.moderatorIds) ? group.moderatorIds : []),
        typeof group?.ownerId === "string" ? group.ownerId : "",
        typeof group?.createdBy === "string" ? group.createdBy : "",
      ].filter((value) => typeof value === "string" && value.trim())
    )
  );
}

function getGroupAdminIds(group = {}) {
  return Array.from(
    new Set(
      [
        ...(Array.isArray(group?.adminIds) ? group.adminIds : []),
        typeof group?.ownerId === "string" ? group.ownerId : "",
        typeof group?.createdBy === "string" ? group.createdBy : "",
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

function getRecordTimestampValue(value) {
  if (!value) {
    return 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value?.toDate === "function") {
    return value.toDate().getTime();
  }

  if (typeof value?.seconds === "number") {
    return value.seconds * 1000;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function mergeTargetPostIntoList(posts = [], targetPost = null) {
  if (!targetPost?.id) {
    return posts;
  }

  const filteredPosts = (Array.isArray(posts) ? posts : []).filter((post) => post?.id && post.id !== targetPost.id);
  return [targetPost, ...filteredPosts].sort(
    (firstPost, secondPost) => getRecordTimestampValue(secondPost?.createdAt) - getRecordTimestampValue(firstPost?.createdAt)
  );
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const groupId = params.id;
  const targetPostId = String(searchParams?.get("postId") || "").trim();
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
  const groupAdminCount = getGroupAdminIds(group).length;
  const canManageGroupPosts = Boolean(user?.uid && getGroupManagerIds(group).includes(user.uid));
  const inviteLink = typeof window !== "undefined" ? `${window.location.origin}/groups/${groupId}` : `/groups/${groupId}`;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const groupData = normalizeGroupRecord(await getGroup(groupId).catch(() => null));
      const postsData = await getPosts({ groupId }).catch(() => []);
      const membersData = await getGroupMembers(groupData).catch(() => []);
      const targetPost = targetPostId ? await getPost(targetPostId).catch(() => null) : null;
      const mergedPosts = targetPost?.groupId === groupId
        ? mergeTargetPostIntoList(postsData || [], targetPost)
        : (postsData || []);
      setGroup(groupData);
      setPosts(mergedPosts);
      setMembers(membersData || []);
    } catch (err) {
      console.error("Error loading group:", err);
      setGroup(null);
      setPosts([]);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [groupId, targetPostId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!targetPostId || loading || !posts.some((post) => post?.id === targetPostId) || typeof window === "undefined") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const postElement = document.getElementById(`group-post-${targetPostId}`);
      postElement?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [loading, posts, targetPostId]);

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

    router.push(`/messages?memberId=${memberId}`);
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
      <div className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.26)] backdrop-blur-[2px] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-200">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight text-slate-900">
                    {group?.name || getGroupName(groupId)}
                  </h1>
                  {typeof group?.membersCount === "number" && (
                    <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-700">
                      {group?.membersCount} {t("members")}
                    </Badge>
                  )}
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  {group?.description || t("groupDefaultDescription")}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full bg-sky-50 text-sky-700">
                {group?.membersCount || 0} {t("members")}
              </Badge>
              <Badge variant="secondary" className="rounded-full bg-violet-50 text-violet-700">
                {posts.length} {t("discussions")}
              </Badge>
              <Badge variant="secondary" className="rounded-full bg-rose-50 text-rose-700">
                {groupAdminCount} {t("groupAdmin")}
              </Badge>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:flex-col">
            {isMember ? (
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-2xl lg:min-w-[200px]"
                onClick={() => handleMembershipChange("leave")}
                disabled={membershipLoading}
              >
                {membershipLoading ? t("leavingGroup") : t("leaveGroup")}
              </Button>
            ) : (
              <Button
                type="button"
                className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 shadow-sm shadow-sky-200 transition-all hover:scale-[1.02] hover:shadow-md lg:min-w-[200px]"
                onClick={() => handleMembershipChange("join")}
                disabled={!user || membershipLoading}
              >
                {membershipLoading ? t("joiningGroup") : t("joinGroup")}
              </Button>
            )}
            <Button type="button" variant="outline" className="w-full rounded-2xl lg:min-w-[200px]" onClick={handleCopyInviteLink}>
              <UserPlus className="mr-2 h-4 w-4" />
              {t("inviteMembers")}
            </Button>
          </div>
        </div>

        {inviteFeedback ? (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
            {inviteFeedback}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <PostForm
            groupId={groupId}
            groupName={group?.name || getGroupName(groupId)}
            canPost={isMember}
            onPostCreated={loadData}
            collapsible
          />

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
                <div
                  key={post.id}
                  id={`group-post-${post.id}`}
                  className={post.id === targetPostId ? "rounded-[2rem] ring-2 ring-rose-200 ring-offset-4 ring-offset-transparent" : undefined}
                >
                  <PostCard post={post} canPin={canManageGroupPosts} onUpdate={loadData} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardTitle className="text-lg">{t("groupInformation")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[1.35rem] border border-slate-100 bg-slate-50/90 p-4">
                <div className="font-medium text-slate-900">{t("members")}</div>
                <div className="mt-1 text-base font-semibold text-slate-800">{group?.membersCount || 0} {t("members")}</div>
              </div>
              <div className="rounded-[1.35rem] border border-slate-100 bg-slate-50/90 p-4">
                <div className="font-medium text-slate-900">{t("posts")}</div>
                <div className="mt-1 text-base font-semibold text-slate-800">{posts.length} {t("discussions")}</div>
              </div>
              <div className="rounded-[1.35rem] border border-slate-100 bg-slate-50/90 p-4">
                <div className="font-medium text-slate-900">{t("groupAdmin")}</div>
                <div className="mt-1 text-base font-semibold text-slate-800">{groupAdminCount} {t("members")}</div>
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
                    <div key={member.id} className="rounded-[1.35rem] border border-slate-100/90 bg-white/85 p-3 shadow-[0_16px_36px_-34px_rgba(15,23,42,0.35)] transition hover:border-rose-100 hover:bg-rose-50/40">
                      <div className="flex min-w-0 items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0 ring-2 ring-rose-100/80">
                          <AvatarImage src={member.photo} alt={member.name} />
                          <AvatarFallback className="bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600 text-sm">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="break-words text-[0.98rem] font-semibold leading-5 tracking-[-0.01em] text-slate-900">{member.name}</div>
                            <Badge variant="secondary" className="rounded-full bg-slate-100 text-[10px] capitalize text-slate-700">
                              {t(member.role)}
                            </Badge>
                          </div>
                          <div className="mt-1 break-words text-xs leading-5 text-slate-500">
                            {member.location || t("member")}
                          </div>
                        </div>
                      </div>
                      {member.id !== user?.uid ? (
                        <div className="mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full rounded-xl text-xs"
                            onClick={() => handleContactMember(member.id)}
                            disabled={!user}
                          >
                            <MessageCircle className="mr-1 h-3 w-3" />
                            {t("contactMember")}
                          </Button>
                        </div>
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
              <div className="rounded-[1.35rem] border border-slate-100 bg-slate-50/90 px-4 py-3 font-mono text-xs leading-5 text-slate-600 break-words">
                {inviteLink}
              </div>
              <Button type="button" variant="outline" className="w-full rounded-2xl" onClick={handleCopyInviteLink}>
                <Link2 className="mr-2 h-4 w-4" />
                {t("copyInviteLink")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

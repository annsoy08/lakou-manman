"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getGroups, joinGroup, leaveGroup } from "@/lib/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

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
  const memberIds = getGroupMemberIds(group);

  return {
    ...group,
    members: memberIds,
    membersCount: memberIds.length,
  };
}

const getDefaultGroups = (t) => [
  { id: "nouveau-ne", name: t("groupNewborn"), description: t("groupNewbornDesc"), membersCount: 0, members: [], adminIds: [], moderatorIds: [], color: "bg-rose-50 text-rose-700" },
  { id: "enfants", name: t("groupChildren"), description: t("groupChildrenDesc"), membersCount: 0, members: [], adminIds: [], moderatorIds: [], color: "bg-emerald-50 text-emerald-700" },
  { id: "adolescents", name: t("groupTeens"), description: t("groupTeensDesc"), membersCount: 0, members: [], adminIds: [], moderatorIds: [], color: "bg-indigo-50 text-indigo-700" },
  { id: "post-partum", name: t("groupPostpartum"), description: t("groupPostpartumDesc"), membersCount: 0, members: [], adminIds: [], moderatorIds: [], color: "bg-pink-50 text-pink-700" },
  { id: "diaspora", name: t("groupDiaspora"), description: t("groupDiasporaDesc"), membersCount: 0, members: [], adminIds: [], moderatorIds: [], color: "bg-sky-50 text-sky-700" },
  { id: "alimentation", name: t("groupFeeding"), description: t("groupFeedingDesc"), membersCount: 0, members: [], adminIds: [], moderatorIds: [], color: "bg-emerald-50 text-emerald-700" },
  { id: "travay-fanmi", name: t("groupWorkFamily"), description: t("groupWorkFamilyDesc"), membersCount: 0, members: [], adminIds: [], moderatorIds: [], color: "bg-violet-50 text-violet-700" },
  { id: "paran-otis", name: t("groupAutismParents"), description: t("groupAutismParentsDesc"), membersCount: 0, members: [], adminIds: [], moderatorIds: [], color: "bg-cyan-50 text-cyan-700" },
  { id: "deuil-perte", name: t("groupGriefLoss"), description: t("groupGriefLossDesc"), membersCount: 0, members: [], adminIds: [], moderatorIds: [], color: "bg-slate-50 text-slate-700" },
];

export default function GroupsPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [groups, setGroups] = useState(getDefaultGroups(t).map(normalizeGroupRecord));
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    async function load() {
      const defaultGroups = getDefaultGroups(t);
      const builtInGroupIds = new Set(defaultGroups.map((group) => group.id));
      try {
        const firestoreGroups = await getGroups();
        const mergedGroupsMap = new Map(defaultGroups.map((group) => [group.id, group]));
        firestoreGroups.forEach((group) => {
          const existingGroup = mergedGroupsMap.get(group.id) || {};
          const isBuiltInGroup = builtInGroupIds.has(group.id);
          mergedGroupsMap.set(group.id, {
            ...existingGroup,
            ...group,
            name: isBuiltInGroup ? existingGroup.name : (group.name || existingGroup.name),
            description: isBuiltInGroup ? existingGroup.description : (group.description || existingGroup.description),
            color: group.color || existingGroup.color,
          });
        });
        setGroups(Array.from(mergedGroupsMap.values()).map(normalizeGroupRecord));
      } catch (err) {
        setGroups(defaultGroups.map(normalizeGroupRecord));
      }
    }
    load();
  }, [language, t]);

  async function handleJoin(groupId) {
    if (!user) return;
    setLoadingId(groupId);
    try {
      await joinGroup(groupId, user.uid);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? normalizeGroupRecord({ ...g, members: [...(g.members || []), user.uid] })
            : g
        )
      );
    } catch (err) {
      console.error("Join error:", err);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleLeave(groupId) {
    if (!user) return;
    setLoadingId(groupId);
    try {
      await leaveGroup(groupId, user.uid);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? normalizeGroupRecord({ ...g, members: (g.members || []).filter((memberId) => memberId !== user.uid) })
            : g
        )
      );
    } catch (err) {
      console.error("Leave error:", err);
    } finally {
      setLoadingId(null);
    }
  }

  function isMember(group) {
    return user && group.members?.includes(user.uid);
  }

  const activeGroups = user ? groups.filter((group) => isMember(group)) : [];
  const discoverGroups = user ? groups.filter((group) => !isMember(group)) : groups;
  const secondaryCount = user ? discoverGroups.length : groups.length;
  const secondaryLabel = user ? t("discoverGroups") : t("groupsTitle");

  function renderGroupCard(group) {
    return (
      <Card key={group.id} className="group flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.26)] backdrop-blur-[2px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_26px_70px_-42px_rgba(15,23,42,0.3)]">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <CardTitle className="min-w-0 break-words text-lg leading-7 tracking-[-0.01em] text-slate-900">{group.name}</CardTitle>
            <Badge className={`w-fit shrink-0 rounded-full ${group.color || "bg-slate-100 text-slate-700"} hover:opacity-90`}>
              {group.membersCount || 0} {t("members")}
            </Badge>
          </div>
          <CardDescription className="line-clamp-3 text-sm leading-6 text-slate-600">
            {group.description || t("groupDefaultDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-auto pt-0">
          <div className="grid gap-3 sm:grid-cols-2">
            {isMember(group) ? (
              <Button
                variant="outline"
                className="w-full rounded-2xl"
                onClick={() => handleLeave(group.id)}
                disabled={loadingId === group.id}
              >
                {loadingId === group.id ? t("leavingGroup") : t("leaveGroup")}
              </Button>
            ) : (
              <Button
                className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 shadow-sm shadow-sky-200 transition-all hover:scale-[1.02] hover:shadow-md"
                onClick={() => handleJoin(group.id)}
                disabled={loadingId === group.id || !user}
              >
                {loadingId === group.id ? t("joiningGroup") : t("joinGroup")}
              </Button>
            )}
            <Link href={`/groups/${group.id}`} className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900">
              {t("seePosts")}
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-200">
          <Users className="h-6 w-6 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t("groupsTitle")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("groupsDescription")}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-[1.75rem] border border-white/70 bg-white/85 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.24)]">
          <CardContent className="p-5">
            <div className="text-sm text-slate-500">{t("activeGroups")}</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{activeGroups.length}</div>
          </CardContent>
        </Card>
        <Card className="rounded-[1.75rem] border border-white/70 bg-white/85 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.24)]">
          <CardContent className="p-5">
            <div className="text-sm text-slate-500">{secondaryLabel}</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{secondaryCount}</div>
          </CardContent>
        </Card>
      </div>

      {user ? (
        <div className="space-y-8">
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t("activeGroups")}</h2>
            </div>
            {activeGroups.length ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {activeGroups.map((group) => renderGroupCard(group))}
              </div>
            ) : (
              <Card className="rounded-[2rem] border border-dashed border-slate-200 shadow-none">
                <CardContent className="p-6 text-sm text-slate-500">{t("noActiveGroups")}</CardContent>
              </Card>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t("discoverGroups")}</h2>
            </div>
            {discoverGroups.length ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {discoverGroups.map((group) => renderGroupCard(group))}
              </div>
            ) : (
              <Card className="rounded-[2rem] border border-dashed border-slate-200 shadow-none">
                <CardContent className="p-6 text-sm text-slate-500">{t("noDiscoverGroups")}</CardContent>
              </Card>
            )}
          </section>
        </div>
      ) : (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t("discoverGroups")}</h2>
            <p className="text-sm text-slate-500">{t("signInToJoinGroups")}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {discoverGroups.map((group) => renderGroupCard(group))}
          </div>
        </section>
      )}
    </div>
  );
}

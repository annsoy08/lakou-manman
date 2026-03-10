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

const getDefaultGroups = (t) => [
  { id: "nouveau-ne", name: t("groupNewborn"), description: t("groupNewbornDesc"), membersCount: 268, color: "bg-rose-50 text-rose-700" },
  { id: "post-partum", name: t("groupPostpartum"), description: t("groupPostpartumDesc"), membersCount: 194, color: "bg-pink-50 text-pink-700" },
  { id: "diaspora", name: t("groupDiaspora"), description: t("groupDiasporaDesc"), membersCount: 321, color: "bg-sky-50 text-sky-700" },
  { id: "alimentation", name: t("groupFeeding"), description: t("groupFeedingDesc"), membersCount: 149, color: "bg-emerald-50 text-emerald-700" },
  { id: "travay-fanmi", name: t("groupWorkFamily"), description: t("groupWorkFamilyDesc"), membersCount: 116, color: "bg-violet-50 text-violet-700" },
  { id: "deuil-perte", name: t("groupGriefLoss"), description: t("groupGriefLossDesc"), membersCount: 87, color: "bg-slate-50 text-slate-700" },
];

export default function GroupsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [groups, setGroups] = useState(getDefaultGroups(t));
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const firestoreGroups = await getGroups();
        if (firestoreGroups.length > 0) {
          setGroups(firestoreGroups);
        }
      } catch (err) {
        console.error("Error loading groups:", err);
      }
    }
    load();
  }, []);

  async function handleJoin(groupId) {
    if (!user) return;
    setLoadingId(groupId);
    try {
      await joinGroup(groupId, user.uid);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, membersCount: (g.membersCount || 0) + 1, members: [...(g.members || []), user.uid] }
            : g
        )
      );
    } catch (err) {
      console.error("Join error:", err);
    } finally {
      setLoadingId(null);
    }
  }

  function isMember(group) {
    return user && group.members?.includes(user.uid);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-200">
          <Users className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t("groupsTitle")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("groupsDescription")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <Card key={group.id} className="group rounded-[2rem] border-0 shadow-sm card-hover">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-lg">{group.name}</CardTitle>
                <Badge className={`rounded-full ${group.color || "bg-slate-100 text-slate-700"} hover:opacity-90`}>
                  {group.membersCount || 0} {t("members")}
                </Badge>
              </div>
              <CardDescription>
                {group.description || t("groupDefaultDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {isMember(group) ? (
                  <Button variant="outline" className="rounded-2xl" disabled>
                    {t("alreadyMember")}
                  </Button>
                ) : (
                  <Button
                    className="rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 shadow-sm shadow-sky-200 transition-all hover:shadow-md hover:scale-[1.02]"
                    onClick={() => handleJoin(group.id)}
                    disabled={loadingId === group.id || !user}
                  >
                    {loadingId === group.id ? t("joiningGroup") : t("joinGroup")}
                  </Button>
                )}
                <Link href={`/groups/${group.id}`}>
                  <Button variant="outline" className="rounded-2xl">
                    {t("seePosts")}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

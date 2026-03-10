"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getReportedPosts,
  getReports,
  getAllUsers,
  hidePost,
  unhidePost,
  resolveReport,
  getPosts,
} from "@/lib/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Trash2,
  MessageCircle,
} from "lucide-react";

export default function AdminPage() {
  const { user, userProfile, isAdmin, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [reportedPosts, setReportedPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/");
    }
  }, [user, isAdmin, authLoading, router]);

  useEffect(() => {
    if (!isAdmin) return;
    async function load() {
      setLoading(true);
      try {
        const [rPosts, rReports, rUsers, rAllPosts] = await Promise.all([
          getReportedPosts(),
          getReports(),
          getAllUsers(),
          getPosts({ limitCount: 50 }),
        ]);
        setReportedPosts(rPosts);
        setReports(rReports);
        setUsers(rUsers);
        setAllPosts(rAllPosts);
      } catch (err) {
        console.error("Admin load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isAdmin]);

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
    setActionLoading(reportId);
    try {
      await resolveReport(reportId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err) {
      console.error("Resolve error:", err);
    } finally {
      setActionLoading(null);
    }
  }

  if (authLoading || loading) {
    return <div className="py-12 text-center text-slate-500">{t("loadingAdminPanel")}</div>;
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-white/70 p-3 shadow-sm">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("adminPanel")}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {t("adminPanelDesc")}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="rounded-2xl border-0 bg-rose-50 shadow-none">
          <CardContent className="p-4">
            <div className="text-2xl font-semibold">{reportedPosts.length}</div>
            <div className="text-sm text-slate-600">{t("reportedPosts")}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 bg-pink-50 shadow-none">
          <CardContent className="p-4">
            <div className="text-2xl font-semibold">{reports.length}</div>
            <div className="text-sm text-slate-600">{t("openReports")}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 bg-sky-50 shadow-none">
          <CardContent className="p-4">
            <div className="text-2xl font-semibold">{users.length}</div>
            <div className="text-sm text-slate-600">{t("users")}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 bg-emerald-50 shadow-none">
          <CardContent className="p-4">
            <div className="text-2xl font-semibold">{allPosts.length}</div>
            <div className="text-sm text-slate-600">{t("totalPosts")}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reported" className="space-y-4">
        <TabsList className="grid h-auto grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-sm md:grid-cols-4">
          <TabsTrigger value="reported" className="rounded-xl">
            <AlertTriangle className="mr-2 h-4 w-4" /> {t("reportedPosts")}
          </TabsTrigger>
          <TabsTrigger value="reports" className="rounded-xl">
            <FileText className="mr-2 h-4 w-4" /> {t("reports")}
          </TabsTrigger>
          <TabsTrigger value="posts" className="rounded-xl">
            <MessageCircle className="mr-2 h-4 w-4" /> {t("allPosts")}
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-xl">
            <Users className="mr-2 h-4 w-4" /> {t("users")}
          </TabsTrigger>
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
                        <Badge variant="secondary" className="mt-2 rounded-full">{post.tag}</Badge>
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
                        Kache
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

        {/* Reports */}
        <TabsContent value="reports" className="space-y-4">
          {reports.length === 0 ? (
            <Card className="rounded-[2rem]">
              <CardContent className="py-8 text-center text-slate-500">
                Pa gen rapò ouvè.
              </CardContent>
            </Card>
          ) : (
            reports.map((report) => (
              <Card key={report.id} className="rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-slate-600">
                        <strong>Post ID:</strong> {report.postId}
                      </div>
                      <div className="text-sm text-slate-600">
                        <strong>Rezon:</strong> {report.reason}
                      </div>
                      {report.createdAt && (
                        <div className="text-xs text-slate-400 mt-1">
                          {formatDate(report.createdAt)}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => handleResolveReport(report.id)}
                      disabled={actionLoading === report.id}
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Rezoud
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
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
                      <span className="text-sm font-medium">{post.authorName || "Anonim"}</span>
                      {post.hidden && <Badge variant="destructive" className="rounded-full">Kache</Badge>}
                      {post.reported && <Badge className="rounded-full bg-pink-100 text-pink-700">Rapòte</Badge>}
                      {post.tag && <Badge variant="secondary" className="rounded-full">{post.tag}</Badge>}
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
                        <Eye className="mr-1 h-3 w-3" /> Montre
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-xl"
                        onClick={() => handleHidePost(post.id)}
                        disabled={actionLoading === post.id}
                      >
                        <EyeOff className="mr-1 h-3 w-3" /> Kache
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
          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardTitle className="text-lg">Itilizatris ({users.length})</CardTitle>
              <CardDescription>Lis tout itilizatris nan platfòm nan.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.name || "San non"}</span>
                        {u.role === "admin" && (
                          <Badge className="rounded-full bg-violet-100 text-violet-700">Admin</Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-500">
                        {u.email} • {u.city || "?"} • {u.country || "?"}
                      </div>
                    </div>
                    {u.createdAt && (
                      <span className="text-xs text-slate-400">{formatDate(u.createdAt)}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

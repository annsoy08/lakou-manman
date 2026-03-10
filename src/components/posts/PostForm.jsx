"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { createPost } from "@/lib/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle } from "lucide-react";

const tagKeys = [
  "tagSleep",
  "tagFeeding", 
  "tagPostpartum",
  "tagCreole",
  "tagHealth",
  "tagEducation",
  "tagCommunity",
];

const getTags = (t) => tagKeys.map(key => t(key));

export default function PostForm({ groupId, groupName, onPostCreated }) {
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    title: "",
    body: "",
    tag: "",
    isAnonymous: false,
  });
  
  const tags = getTags(t);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset form when language changes to update placeholders
  useEffect(() => {
    if (form.tag) {
      // Keep the tag key but the display will update automatically
      setForm(prev => ({ ...prev }));
    }
  }, [t]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return;
    if (!form.title.trim() || !form.body.trim()) {
      setError("Tit ak kontni obligatwa.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const postId = await createPost({
        authorId: user.uid,
        authorName: form.isAnonymous ? "Anonim" : (userProfile?.name || user.displayName || "Manman"),
        title: form.title.trim(),
        body: form.body.trim(),
        tag: form.tag || "Kominote",
        groupId: groupId || null,
        groupName: groupName || null,
        location: userProfile?.city || "",
        childAge: userProfile?.childAges || "",
        isAnonymous: form.isAnonymous,
        verified: false,
      });
      setForm({ title: "", body: "", tag: "", isAnonymous: false });
      if (onPostCreated) onPostCreated(postId);
    } catch (err) {
      console.error("Create post error:", err);
      setError("Yon erè rive. Eseye ankò.");
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <Card className="rounded-[2rem]">
        <CardContent className="p-6 text-center text-sm text-slate-600">
          <p>{t("connectToPost")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle className="text-lg">{t("publishPost")}</CardTitle>
        <CardDescription>{t("publishPostDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          <Input
            placeholder={t("questionTitle")}
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            className="rounded-xl"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select value={form.tag} onValueChange={(v) => updateField("tag", v)} key={t("category")}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder={t("category")} />
              </SelectTrigger>
              <SelectContent>
                {tagKeys.map((key) => (
                  <SelectItem key={key} value={key}>{t(key)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.isAnonymous}
                onChange={(e) => updateField("isAnonymous", e.target.checked)}
                className="rounded"
              />
              {t("anonymous")}
            </label>
          </div>
          <Textarea
            placeholder={t("writePost")}
            value={form.body}
            onChange={(e) => updateField("body", e.target.value)}
            className="min-h-[120px] rounded-xl"
          />
          <Button type="submit" className="w-full rounded-xl" disabled={loading}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {loading ? t("loading") + "..." : t("publish")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

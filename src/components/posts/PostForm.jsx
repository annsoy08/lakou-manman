"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { createPost } from "@/lib/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageUpload from "@/components/ui/ImageUpload";
import VideoUpload from "@/components/ui/VideoUpload";
import { ImageIcon, PlusCircle, Smile, Video } from "lucide-react";

const emojiOptions = ["❤️", "🙏", "🥰", "😊", "😂", "😭", "😴", "🤱", "👶", "🍼", "🌸", "✨", "😍", "😘", "🤗", "💪", "🙌", "👏", "🤎", "💙", "🎉", "😅", "🥹", "🔥"];

export default function PostForm({ groupId, groupName, onPostCreated }) {
  const { user, userProfile } = useAuth();
  const { t, language } = useLanguage();
  const [form, setForm] = useState({
    title: "",
    body: "",
    tag: "",
    isAnonymous: false,
    images: [],
    videos: [],
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeMediaType, setActiveMediaType] = useState("images");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiTarget, setEmojiTarget] = useState("body");
  const emojiUi = language === "ht"
    ? {
        title: "Emojis nan pòs la",
        addToTitle: "Ajoute nan tit la",
        addToBody: "Ajoute nan tèks la",
        missingContentError: "Ekri yon tit oswa yon kontni pou pibliye.",
        publishError: "Yon erè rive. Eseye ankò.",
        anonymousAuthor: "Anonim",
        groupPostLabel: "Piblikasyon sa a ap parèt nan gwoup la",
      }
    : {
        title: "Emojis dans le post",
        addToTitle: "Ajouter au titre",
        addToBody: "Ajouter au texte",
        missingContentError: "Ajoutez un titre ou un contenu pour publier.",
        publishError: "Une erreur est survenue. Réessayez.",
        anonymousAuthor: "Anonyme",
        groupPostLabel: "Cette publication apparaîtra dans le groupe",
      };

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

  function appendEmoji(emoji) {
    const field = emojiTarget === "title" ? "title" : "body";
    setForm((prev) => ({
      ...prev,
      [field]: `${prev[field] || ""}${prev[field] ? " " : ""}${emoji}`,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return;
    const trimmedTitle = form.title.trim();
    const trimmedBody = form.body.trim();

    if (!trimmedTitle && !trimmedBody) {
      setError(emojiUi.missingContentError);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const postId = await createPost({
        authorId: user.uid,
        authorName: form.isAnonymous ? emojiUi.anonymousAuthor : (userProfile?.name || user.displayName || "Manman"),
        title: trimmedTitle,
        body: trimmedBody,
        images: form.images,
        videos: form.videos,
        tag: groupId ? "tagCommunity" : (form.tag || "tagCommunity"),
        groupId: groupId || null,
        groupName: groupName || null,
        location: userProfile?.city || "",
        childAge: userProfile?.childAges || "",
        isAnonymous: form.isAnonymous,
        verified: false,
      });
      setForm({ title: "", body: "", tag: "", isAnonymous: false, images: [], videos: [] });
      if (onPostCreated) onPostCreated(postId);
    } catch (err) {
      console.error("Create post error:", err);
      setError(emojiUi.publishError);
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
          {groupId ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
              {emojiUi.groupPostLabel}{groupName ? ` : ${groupName}` : ""}
            </div>
          ) : null}
          <Textarea
            placeholder={t("writePost")}
            value={form.body}
            onFocus={() => setEmojiTarget("body")}
            onChange={(e) => updateField("body", e.target.value)}
            className="min-h-[140px] rounded-xl"
          />
          <Input
            placeholder={`${t("questionTitle")} (${language === "fr" ? "optionnel" : "opsyonèl"})`}
            value={form.title}
            onFocus={() => setEmojiTarget("title")}
            onChange={(e) => updateField("title", e.target.value)}
            className="rounded-xl"
          />
          <div className={`grid gap-3 ${groupId ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto]"}`}>
            {!groupId ? (
              <Select value={form.tag} onValueChange={(v) => updateField("tag", v)} key={t("category")}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t("category")} />
                </SelectTrigger>
                <SelectContent>
                  {[
                      { key: 'tagSleep', fr: 'Sommeil bébé', ht: 'Dòmi tibebe' },
                      { key: 'tagFeeding', fr: 'Alimentation', ht: 'Alimantasyon' },
                      { key: 'tagPostpartum', fr: 'Post-partum', ht: 'Post-partum' },
                      { key: 'tagCreole', fr: 'Mères dans la diaspora', ht: 'Manman nan diaspora' },
                      { key: 'tagWorkKids', fr: 'Travail et enfants', ht: 'Travay ak timoun' },
                      { key: 'tagHealth', fr: 'Santé', ht: 'Lasante' },
                      { key: 'tagEducation', fr: 'Éducation', ht: 'Edikasyon' },
                      { key: 'tagCommunity', fr: 'Communauté', ht: 'Kominote' }
                    ].map(tag => {
                      const displayText = language === 'fr' ? tag.fr : tag.ht;
                      return (
                        <SelectItem key={tag.key} value={tag.key}>
                          {displayText}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            ) : null}
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.isAnonymous}
                onChange={(e) => updateField("isAnonymous", e.target.checked)}
                className="rounded"
              />
              {t("anonymous")}
            </label>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
              >
                <Smile className="mr-2 h-4 w-4" />
                {emojiUi.title}
              </Button>
              <span className="text-xs text-slate-500">
                {emojiTarget === "title" ? emojiUi.addToTitle : emojiUi.addToBody}
              </span>
            </div>

            {showEmojiPicker ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {emojiOptions.map((emoji) => (
                  <button
                    type="button"
                    key={emoji}
                    onClick={() => appendEmoji(emoji)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg transition hover:border-rose-200 hover:bg-rose-50"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={activeMediaType === "images" ? "default" : "outline"}
                className="rounded-xl"
                onClick={() => setActiveMediaType("images")}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                {t("images")} ({form.images.length})
              </Button>
              <Button
                type="button"
                variant={activeMediaType === "videos" ? "default" : "outline"}
                className="rounded-xl"
                onClick={() => setActiveMediaType("videos")}
              >
                <Video className="mr-2 h-4 w-4" />
                {language === "fr" ? "Vidéos" : "Videyo"} ({form.videos.length})
              </Button>
            </div>

            {activeMediaType === "images" ? (
              <ImageUpload
                images={form.images}
                onChange={(images) => updateField("images", images)}
                maxImages={4}
                pathPrefix={user ? `posts/${user.uid}` : "posts"}
              />
            ) : (
              <VideoUpload
                videos={form.videos}
                onChange={(videos) => updateField("videos", videos)}
                maxVideos={1}
                pathPrefix={user ? `posts/${user.uid}/videos` : "posts/videos"}
              />
            )}
          </div>
          <Button type="submit" className="w-full rounded-xl" disabled={loading}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {loading ? t("loading") + "..." : t("publish")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

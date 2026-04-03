"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import ActionDialog from "@/components/ui/action-dialog";
import { getInitials, formatDate } from "@/lib/utils";
import { toggleLike, savePost, addComment, getComments, reportPost, createConversation, setGroupPostPinned } from "@/lib/firestore";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Send,
  Flag,
  ChevronDown,
  ChevronUp,
  Pin,
  Smile,
} from "lucide-react";

const COMMENT_EMOJI_OPTIONS = ["❤️", "🙏", "🥰", "😊", "😂", "😭", "😍", "😘", "🤗", "✨", "🌸", "🔥", "👏", "🙌", "💙", "🤎", "🫶", "🥹"];

export default function PostCard({ post, comments: initialComments = [], canPin = false, onUpdate }) {
  const { user, userProfile } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(initialComments);
  const [commentsLoaded, setCommentsLoaded] = useState(initialComments.length > 0);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [showCommentEmojiPicker, setShowCommentEmojiPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [dialogState, setDialogState] = useState({
    open: false,
    tone: "info",
    title: "",
    message: "",
  });
  const postImages = Array.isArray(post.images) ? post.images.filter(Boolean) : [];
  const postVideos = Array.isArray(post.videos) ? post.videos.filter(Boolean) : [];
  const postDialogUi = language === "ht"
    ? {
        messageDialogTitle: "Konvèsasyon",
        reportDialogTitle: "Siyale pòs sa a",
        reportSent: "Signalman an voye bay ekip modération an.",
        reportError: "Nou pa t ka voye signalman an pou kounye a.",
        commentsLoadError: "Nou pa t ka chaje kòmantè yo pou kounye a.",
        babyLabel: "Tibebe",
        groupLabel: "Gwoup",
        loadingComments: "Ap chaje kòmantè yo...",
      }
    : {
        messageDialogTitle: "Conversation",
        reportDialogTitle: "Signaler ce post",
        reportSent: "Le signalement a été transmis à l'équipe de modération.",
        reportError: "Impossible d'envoyer le signalement pour le moment.",
        commentsLoadError: "Impossible de charger les commentaires pour le moment.",
        babyLabel: "Bébé",
        groupLabel: "Groupe",
        loadingComments: "Chargement des commentaires...",
      };

  async function handleTogglePin() {
    if (!user?.uid || !canPin || !post?.groupId) {
      return;
    }

    setPinning(true);
    try {
      await setGroupPostPinned(post.id, user.uid, !post.pinned);
      onUpdate?.();
    } catch (error) {
      console.error("Pin post error:", error);
      setDialogState({
        open: true,
        tone: "error",
        title: postDialogUi.groupLabel,
        message: t("pinPostError"),
      });
    } finally {
      setPinning(false);
    }
  }

  const isAnonymousPost = Boolean(post.isAnonymous);
  const authorDisplayName = isAnonymousPost ? t("anonymous") : post.authorName;
  const authorDisplayPhoto = isAnonymousPost ? "" : post.authorPhoto;
  const authorMeta = [
    !isAnonymousPost && post.location ? post.location : "",
    !isAnonymousPost && post.childAge ? `${postDialogUi.babyLabel}: ${post.childAge}` : "",
    post.groupName ? `${postDialogUi.groupLabel}: ${post.groupName}` : "",
  ].filter(Boolean).join(" • ");

  function appendCommentEmoji(emoji) {
    if (!emoji) {
      return;
    }

    setNewComment((current) => `${current || ""}${emoji}`);
  }

  async function handleLike() {
    if (!user) return;
    try {
      const nowLiked = await toggleLike(post.id, user.uid);
      setLiked(nowLiked);
      setLikesCount((prev) => (nowLiked ? prev + 1 : prev - 1));
    } catch (e) {
      console.error("Like error:", e);
    }
  }

  async function handleSave() {
    if (!user) return;
    try {
      const nowSaved = await savePost(user.uid, post.id);
      setSaved(nowSaved);
    } catch (e) {
      console.error("Save error:", e);
    }
  }

  async function handleMessageUser() {
    if (!user || user.uid === post.authorId) return;
    try {
      const conversationId = await createConversation([user.uid, post.authorId]);
      router.push(`/messages?conversationId=${conversationId}`);
    } catch (e) {
      console.error("Error opening conversation:", e);
      setDialogState({
        open: true,
        tone: "error",
        title: postDialogUi.messageDialogTitle,
        message: t("conversationError"),
      });
    }
  }

  async function handleComment(e) {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    setSubmitting(true);
    try {
      const commentId = await addComment(post.id, {
        authorId: user.uid,
        authorName: userProfile?.name || user.displayName || "Anonim",
        content: newComment.trim(),
      });
      setComments((prev) => [
        ...prev,
        {
          id: commentId,
          authorName: userProfile?.name || user.displayName || "Anonim",
          content: newComment.trim(),
          createdAt: new Date(),
        },
      ]);
      setCommentsLoaded(true);
      setNewComment("");
      setShowCommentEmojiPicker(false);
    } catch (e) {
      console.error("Comment error:", e);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmReport() {
    if (!user) return;
    try {
      await reportPost(post.id, user.uid, "Reported by user");
      setReportDialogOpen(false);
      setDialogState({
        open: true,
        tone: "success",
        title: postDialogUi.reportDialogTitle,
        message: postDialogUi.reportSent,
      });
    } catch (e) {
      console.error("Report error:", e);
      setDialogState({
        open: true,
        tone: "error",
        title: postDialogUi.reportDialogTitle,
        message: postDialogUi.reportError,
      });
    }
  }

  function handleReport() {
    if (!user) return;
    setReportDialogOpen(true);
  }

  async function handleToggleComments() {
    const nextOpen = !showComments;
    setShowComments(nextOpen);

    if (!nextOpen || commentsLoaded || commentsLoading || !post.id) {
      return;
    }

    setCommentsLoading(true);
    try {
      const loadedComments = await getComments(post.id);
      setComments(loadedComments);
      setCommentsLoaded(true);
    } catch (error) {
      console.error("Comments load error:", error);
      setDialogState({
        open: true,
        tone: "error",
        title: postDialogUi.messageDialogTitle,
        message: postDialogUi.commentsLoadError,
      });
    } finally {
      setCommentsLoading(false);
    }
  }

  function handleWhatsAppShare() {
    if (typeof window === "undefined") return;

    const shareText = [post.title, post.body, window.location.href]
      .filter(Boolean)
      .join("\n\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <Card className="overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-white/95 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.35)] transition-all duration-300 hover:shadow-[0_28px_65px_-42px_rgba(15,23,42,0.42)]">
      <CardContent className="p-4 sm:p-5 lg:p-6">
        {/* Author info */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 w-full flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-rose-100">
              {authorDisplayPhoto && (
                <AvatarImage 
                  src={authorDisplayPhoto} 
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
              <AvatarFallback className="bg-gradient-to-br from-rose-400 to-pink-500 text-white">
                {getInitials(authorDisplayName || t("anonymous"))}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              {isAnonymousPost ? (
                <div className="font-medium text-slate-900">
                  {authorDisplayName}
                </div>
              ) : (
                <button
                  onClick={() => router.push(`/profile/${post.authorId}`)}
                  className="truncate text-left font-semibold tracking-[-0.015em] text-slate-900 transition-colors hover:text-rose-600"
                >
                  {authorDisplayName}
                </button>
              )}
              <div className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                {formatDate(post.createdAt, language)}
              </div>
              {authorMeta ? (
                <div className="mt-1 break-words text-xs leading-5 text-slate-500">
                  {authorMeta}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex w-full items-start justify-between gap-2 sm:w-auto sm:shrink-0 sm:justify-start sm:self-start">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {post.pinned ? (
                <Badge variant="secondary" className="rounded-full border border-amber-100 bg-amber-50/90 px-3 py-1 text-[11px] font-medium leading-4 text-amber-700">
                  <Pin className="mr-1 h-3 w-3" />
                  {t("pinnedInGroup")}
                </Badge>
              ) : null}
              {post.tag && (
                <Badge variant="secondary" className="max-w-[calc(100%-3.25rem)] whitespace-normal break-words rounded-full border border-rose-100 bg-rose-50/90 px-3 py-1 text-[11px] font-medium leading-4 text-rose-600 sm:max-w-none">
                  {(() => {
                    return post.tag === 'tagFeeding' ? (language === 'fr' ? 'Alimentation' : 'Alimantasyon') :
                           post.tag === 'tagSleep' ? (language === 'fr' ? 'Sommeil bébé' : 'Dòmi tibebe') :
                           post.tag === 'tagPostpartum' ? 'Post-partum' :
                           post.tag === 'tagCreole' ? (language === 'fr' ? 'Mères dans la diaspora' : 'Manman nan diaspora') :
                           post.tag === 'tagWorkKids' ? (language === 'fr' ? 'Travail et enfants' : 'Travay ak timoun') :
                           post.tag === 'tagHealth' ? (language === 'fr' ? 'Santé' : 'Lasante') :
                           post.tag === 'tagEducation' ? (language === 'fr' ? 'Éducation' : 'Edikasyon') :
                           post.tag === 'tagCommunity' ? (language === 'fr' ? 'Communauté' : 'Kominote') :
                           post.tag === 'sommeil' ? (language === 'fr' ? 'Sommeil bébé' : 'Dòmi tibebe') :
                           post.tag === 'alimentation' ? (language === 'fr' ? 'Alimentation' : 'Alimantasyon') :
                           post.tag === 'Sommeil' ? (language === 'fr' ? 'Sommeil bébé' : 'Dòmi tibebe') :
                           post.tag === 'Alimentation' ? (language === 'fr' ? 'Alimentation' : 'Alimantasyon') :
                           post.tag === 'Dòmi' ? (language === 'fr' ? 'Sommeil bébé' : 'Dòmi tibebe') :
                           post.tag === 'Alimantasyon' ? (language === 'fr' ? 'Alimentation' : 'Alimantasyon') :
                           post.tag;
                  })()}
                </Badge>
              )}
            </div>
            <button
              onClick={handleSave}
              className="shrink-0 rounded-full border border-slate-200/80 bg-white p-2.5 shadow-sm transition-all hover:border-rose-100 hover:bg-rose-50 hover:scale-[1.04]"
            >
              <Bookmark className={`h-4 w-4 ${saved ? "fill-current text-rose-500" : ""}`} />
            </button>
          </div>
        </div>

        {/* Post content */}
        <div className="mt-5 space-y-3">
          {post.title ? (
            <h3 className="font-display break-words text-[1.12rem] font-semibold leading-[1.22] tracking-[-0.03em] text-slate-900 sm:text-[1.24rem]">
              {language === 'ht' ? 
                post.title.replace(/sommeil/gi, 'dòmi').replace(/alimentation/gi, 'alimantasyon') : 
                post.title}
            </h3>
          ) : null}
          <p className="break-words text-[0.95rem] leading-7 text-slate-600 sm:text-[0.98rem]">
            {language === 'ht' ? 
              post.body.replace(/sommeil/gi, 'dòmi').replace(/alimentation/gi, 'alimantasyon') : 
              post.body}
          </p>
        </div>
        {postImages.length > 0 && (
          <div className={`mt-5 grid gap-3 ${postImages.length === 1 ? "grid-cols-1" : "sm:grid-cols-2"}`}>
            {postImages.map((image, index) => {
              const imageUrl = typeof image === "string" ? image : image?.url;
              const imageName = typeof image === "string" ? `Post image ${index + 1}` : image?.name || `Post image ${index + 1}`;

              if (!imageUrl) {
                return null;
              }

              return (
                <a
                  key={`${post.id}-image-${index}`}
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-[1.35rem] border border-slate-100 bg-slate-100"
                >
                  <img
                    src={imageUrl}
                    alt={imageName}
                    className={`w-full object-cover transition-transform duration-300 hover:scale-[1.02] ${postImages.length === 1 ? "max-h-[420px]" : "h-56"}`}
                  />
                </a>
              );
            })}
          </div>
        )}
        {postVideos.length > 0 && (
          <div className="mt-5 grid gap-3">
            {postVideos.map((video, index) => {
              const videoUrl = typeof video === "string" ? video : video?.url;
              const videoName = typeof video === "string" ? `Post video ${index + 1}` : video?.name || `Post video ${index + 1}`;

              if (!videoUrl) {
                return null;
              }

              return (
                <div key={`${post.id}-video-${index}`} className="overflow-hidden rounded-[1.35rem] border border-slate-100 bg-slate-100">
                  <video
                    src={videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    aria-label={videoName}
                    className="max-h-[420px] w-full bg-black"
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100/90 pt-4 text-sm text-slate-500">
          <button
            onClick={handleLike}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-all sm:px-3.5 sm:text-sm ${
              liked ? "border-rose-100 bg-rose-100 text-rose-600 shadow-sm" : "border-rose-100/60 bg-rose-50/70 hover:bg-rose-100 hover:shadow-sm"
            }`}
          >
            <Heart className={`h-4 w-4 transition-transform ${liked ? "fill-current scale-110" : "hover:scale-110"}`} /> {likesCount}
          </button>
          <button
            onClick={handleToggleComments}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-xs font-medium transition-all hover:bg-slate-100 hover:shadow-sm sm:px-3.5 sm:text-sm"
          >
            <MessageCircle className="h-4 w-4" /> {post.commentsCount || comments.length}
            {showComments ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
          <button
            onClick={handleWhatsAppShare}
            className="inline-flex items-center gap-1.5 rounded-full border border-green-100 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 transition-all hover:bg-green-100 hover:shadow-sm sm:px-3.5 sm:text-sm"
          >
            <Send className="h-4 w-4" /> {t("whatsapp")}
          </button>
          {user && user.uid !== post.authorId && (
            <button
              onClick={handleMessageUser}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] px-3 py-2 text-xs font-medium text-white shadow-[0_16px_30px_-22px_rgba(123,26,44,0.8)] transition-all hover:shadow-sm sm:px-3.5 sm:text-sm"
            >
              <MessageCircle className="h-4 w-4" /> {t("messageUser")}
            </button>
          )}
          {user && (
            <button
              onClick={handleReport}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-slate-50 px-3 py-2 text-xs transition hover:bg-slate-100 sm:text-sm"
            >
              <Flag className="h-4 w-4" /> <span className="hidden sm:inline">{t("report")}</span>
            </button>
          )}
          {canPin && post.groupId ? (
            <button
              onClick={handleTogglePin}
              disabled={pinning}
              className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              <Pin className="h-4 w-4" />
              <span>{post.pinned ? t("unpinPost") : t("pinPost")}</span>
            </button>
          ) : null}
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
            {commentsLoading ? (
              <div className="rounded-[1.1rem] border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-500">
                {postDialogUi.loadingComments}
              </div>
            ) : null}
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs">
                    {getInitials(comment.authorName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 rounded-[1.1rem] border border-slate-100 bg-slate-50/80 p-3">
                  <div className="flex items-center gap-2">
                    <span className="break-words text-sm font-medium">{comment.authorName}</span>
                    <span className="text-xs text-slate-400">
                      {formatDate(comment.createdAt, language)}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-sm text-slate-600">{comment.content}</p>
                </div>
              </div>
            ))}

            {user && (
              <form onSubmit={handleComment} className="space-y-2">
                <div className="flex items-start gap-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={t("writeComment")}
                    className="min-h-[84px] flex-1 rounded-[1.1rem] border-slate-200 bg-white/90 text-[0.95rem]"
                  />
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-[1rem]"
                      onClick={() => setShowCommentEmojiPicker((current) => !current)}
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={submitting || !newComment.trim()}
                      className="rounded-[1rem] bg-gradient-to-r from-rose-500 to-pink-600 shadow-sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {showCommentEmojiPicker ? (
                  <div className="flex flex-wrap gap-2 rounded-[1.1rem] border border-slate-100 bg-slate-50 p-3">
                    {COMMENT_EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => appendCommentEmoji(emoji)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg transition hover:border-rose-200 hover:bg-rose-50"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : null}
              </form>
            )}
          </div>
        )}
      </CardContent>

      <ActionDialog
        open={reportDialogOpen}
        tone="danger"
        title={postDialogUi.reportDialogTitle}
        message={t("confirmReport")}
        confirmLabel={t("confirm")}
        cancelLabel={t("cancel")}
        closeLabel={t("close")}
        loadingLabel={t("loading")}
        onClose={() => setReportDialogOpen(false)}
        onConfirm={confirmReport}
      />

      <ActionDialog
        open={dialogState.open}
        tone={dialogState.tone}
        title={dialogState.title}
        message={dialogState.message}
        closeLabel={t("close")}
        onClose={() => setDialogState((prev) => ({ ...prev, open: false }))}
      />
    </Card>
  );
}

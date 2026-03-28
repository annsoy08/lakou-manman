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
import { toggleLike, savePost, addComment, getComments, reportPost, createConversationRequest } from "@/lib/firestore";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Send,
  Flag,
  ChevronDown,
  ChevronUp,
  Smile,
} from "lucide-react";

const COMMENT_EMOJI_OPTIONS = ["❤️", "🙏", "🥰", "😊", "😂", "😭", "😍", "😘", "🤗", "✨", "🌸", "🔥", "👏", "🙌", "💙", "🤎", "🫶", "🥹"];

export default function PostCard({ post, comments: initialComments = [], onUpdate }) {
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
      const result = await createConversationRequest({
        fromUserId: user.uid,
        toUserId: post.authorId,
      });

      if (result.status === "existing_conversation") {
        router.push(`/messages?conversationId=${result.conversationId}`);
      } else {
        router.push("/messages");
      }
    } catch (e) {
      console.error("Error requesting conversation:", e);
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
    <Card className="rounded-[1.5rem] border-0 shadow-sm transition-all hover:shadow-md">
      <CardContent className="p-6">
        {/* Author info */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
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
                  className="font-medium text-slate-900 hover:text-rose-600 transition-colors"
                >
                  {authorDisplayName}
                </button>
              )}
              <div className="text-xs text-slate-500">
                {formatDate(post.createdAt, language)}
              </div>
              {authorMeta ? (
                <div className="mt-0.5 text-xs text-slate-500">
                  {authorMeta}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {post.tag && (
              <Badge variant="secondary" className="rounded-full bg-rose-50 text-rose-600">
                {(() => {
                  return post.tag === 'tagFeeding' ? (language === 'fr' ? 'Alimentation' : 'Alimantasyon') :
                         post.tag === 'tagSleep' ? (language === 'fr' ? 'Sommeil bébé' : 'Dòmi tibebe') :
                         post.tag === 'tagPostpartum' ? 'Post-partum' :
                         post.tag === 'tagCreole' ? (language === 'fr' ? 'Mères dans la diaspora' : 'Manman nan diaspora') :
                         post.tag === 'tagWorkKids' ? (language === 'fr' ? 'Travail et enfants' : 'Travay ak timoun') :
                         post.tag === 'tagHealth' ? (language === 'fr' ? 'Santé' : 'Lasante') :
                         post.tag === 'tagEducation' ? (language === 'fr' ? 'Éducation' : 'Edikasyon') :
                         post.tag === 'tagCommunity' ? (language === 'fr' ? 'Communauté' : 'Kominote') :
                         // Fallback for incorrect data
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
            <button
              onClick={handleSave}
              className="rounded-full bg-slate-50 p-2 transition-all hover:bg-rose-50 hover:scale-110"
            >
              <Bookmark className={`h-4 w-4 ${saved ? "fill-current text-rose-500" : ""}`} />
            </button>
          </div>
        </div>

        {/* Post content */}
        <h3 className="mt-4 text-lg font-semibold tracking-tight">
          {language === 'ht' ? 
            post.title.replace(/sommeil/gi, 'dòmi').replace(/alimentation/gi, 'alimantasyon') : 
            post.title}
        </h3>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          {language === 'ht' ? 
            post.body.replace(/sommeil/gi, 'dòmi').replace(/alimentation/gi, 'alimantasyon') : 
            post.body}
        </p>
        {postImages.length > 0 && (
          <div className={`mt-4 grid gap-3 ${postImages.length === 1 ? "grid-cols-1" : "sm:grid-cols-2"}`}>
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
                  className="overflow-hidden rounded-2xl bg-slate-100"
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
          <div className="mt-4 grid gap-3">
            {postVideos.map((video, index) => {
              const videoUrl = typeof video === "string" ? video : video?.url;
              const videoName = typeof video === "string" ? `Post video ${index + 1}` : video?.name || `Post video ${index + 1}`;

              if (!videoUrl) {
                return null;
              }

              return (
                <div key={`${post.id}-video-${index}`} className="overflow-hidden rounded-2xl bg-slate-100">
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
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <button
            onClick={handleLike}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-all ${
              liked ? "bg-rose-100 text-rose-600 shadow-sm" : "bg-rose-50/70 hover:bg-rose-100 hover:shadow-sm"
            }`}
          >
            <Heart className={`h-4 w-4 transition-transform ${liked ? "fill-current scale-110" : "hover:scale-110"}`} /> {likesCount}
          </button>
          <button
            onClick={handleToggleComments}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-50/70 px-3.5 py-1.5 transition-all hover:bg-slate-100 hover:shadow-sm"
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
            className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3.5 py-1.5 text-green-700 transition-all hover:bg-green-100 hover:shadow-sm"
          >
            <Send className="h-4 w-4" /> {t("whatsapp")}
          </button>
          {user && user.uid !== post.authorId && (
            <button
              onClick={handleMessageUser}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] text-white px-3.5 py-1.5 transition-all hover:shadow-sm"
            >
              <MessageCircle className="h-4 w-4" /> {t("messageUser")}
            </button>
          )}
          {user && (
            <button
              onClick={handleReport}
              className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 hover:bg-slate-100"
            >
              <Flag className="h-4 w-4" /> <span className="hidden sm:inline">{t("report")}</span>
            </button>
          )}
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            {commentsLoading ? (
              <div className="rounded-xl bg-slate-50/80 px-4 py-3 text-sm text-slate-500">
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
                <div className="flex-1 rounded-xl bg-slate-50/80 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{comment.authorName}</span>
                    <span className="text-xs text-slate-400">
                      {formatDate(comment.createdAt, language)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{comment.content}</p>
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
                    className="min-h-[84px] flex-1 rounded-xl text-base"
                  />
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => setShowCommentEmojiPicker((current) => !current)}
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={submitting || !newComment.trim()}
                      className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 shadow-sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {showCommentEmojiPicker ? (
                  <div className="flex flex-wrap gap-2 rounded-xl bg-slate-50 p-3">
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

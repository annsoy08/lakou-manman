"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
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
import { toggleLike, savePost, addComment, getComments, reportPost, createConversation, setGroupPostPinned, sharePost, resharePost, getPost, toggleCommentLike } from "@/lib/firestore";
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
  Share2,
  Link,
  Mail,
  CheckCheck,
  Repeat2,
} from "lucide-react";

const COMMENT_EMOJI_OPTIONS = ["❤️", "🙏", "🥰", "😊", "😂", "😭", "😍", "😘", "🤗", "✨", "🌸", "🔥", "👏", "🙌", "💙", "🤎", "🫶", "🥹"];

export default function PostCard({ post, comments: initialComments = [], canPin = false, onUpdate }) {
  const { user, userProfile } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [localCommentsCount, setLocalCommentsCount] = useState(post.commentsCount || 0);
  const [commentLikesMap, setCommentLikesMap] = useState({});
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(initialComments);
  const [commentsLoaded, setCommentsLoaded] = useState(initialComments.length > 0);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [showCommentEmojiPicker, setShowCommentEmojiPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [sharesCount, setSharesCount] = useState(post.sharesCount || 0);
  const shareMenuRef = useRef(null);
  const commentTextareaRef = useRef(null);
  const modalCommentInputRef = useRef(null);
  const [reshareDestination, setReshareDestination] = useState("feed");
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [showOriginalModal, setShowOriginalModal] = useState(false);
  const [originalPostFetched, setOriginalPostFetched] = useState(null);
  const [originalPostLoading, setOriginalPostLoading] = useState(false);
  const [originalPostComments, setOriginalPostComments] = useState([]);
  const [originalCommentLikesMap, setOriginalCommentLikesMap] = useState({});
  const [newOriginalComment, setNewOriginalComment] = useState("");
  const [submittingOriginalComment, setSubmittingOriginalComment] = useState(false);
  const [reshareOpen, setReshareOpen] = useState(false);
  const [reshareComment, setReshareComment] = useState("");
  const [reshareLoading, setReshareLoading] = useState(false);
  const [reshared, setReshared] = useState(false);
  const [reshareEmojiOpen, setReshareEmojiOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [dialogState, setDialogState] = useState({
    open: false,
    tone: "info",
    title: "",
    message: "",
  });
  const postImages = Array.isArray(post.images) ? post.images.filter(Boolean) : [];
  const postVideos = Array.isArray(post.videos) ? post.videos.filter(Boolean) : [];
  useEffect(() => {
    if (!shareMenuOpen) return;
    function handleClickOutside(e) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target)) {
        setShareMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [shareMenuOpen]);

  function getPostShareLink() {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    if (post.groupId) return `${origin}/groups/${post.groupId}?postId=${post.id}`;
    return `${origin}/feed?postId=${post.id}`;
  }

  async function recordShare() {
    if (!user) return;
    try {
      await sharePost(post.id, user.uid);
      setSharesCount((prev) => prev + 1);
    } catch (e) {
      console.error("Share record error:", e);
    }
  }

  async function handleCopyLink() {
    setShareMenuOpen(false);
    const link = getPostShareLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      /* silent */
    }
    recordShare();
  }

  function handleWhatsAppShareFromMenu() {
    setShareMenuOpen(false);
    const shareText = [post.title, post.body, getPostShareLink()].filter(Boolean).join("\n\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
    recordShare();
  }

  function handleEmailShareFromMenu() {
    setShareMenuOpen(false);
    const link = getPostShareLink();
    const subject = encodeURIComponent(post.title || "Publication Lakou Manman");
    const body = encodeURIComponent(`${post.body ? post.body + "\n\n" : ""}${link}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
    recordShare();
  }

  async function handleNativeShare() {
    setShareMenuOpen(false);
    const link = getPostShareLink();
    if (!navigator.share) return;
    try {
      await navigator.share({ title: post.title || "Lakou Manman", text: post.body || "", url: link });
      recordShare();
    } catch { /* user cancelled */ }
  }

  async function handleReshare() {
    if (!user || reshareLoading) return;
    setReshareLoading(true);
    try {
      const originalPostData = post.isReshare ? {
        id: post.originalPostId,
        authorId: post.originalAuthorId,
        authorName: post.originalAuthorName,
        authorPhoto: post.originalAuthorPhoto,
        title: post.originalPostTitle,
        body: post.originalPostBody,
        images: post.originalPostImages || [],
        tag: post.originalPostTag,
        groupId: post.originalPostGroupId,
        groupName: post.originalPostGroupName,
      } : post;
      await resharePost({
        originalPost: originalPostData,
        sharerId: user.uid,
        sharerName: userProfile?.name || user.displayName || "Anonim",
        sharerPhoto: userProfile?.photoURL || user.photoURL || "",
        comment: reshareComment.trim(),
        destGroupId: reshareDestination === "group" ? (post.groupId || "") : "",
      });
      setSharesCount((prev) => prev + 1);
      setReshared(true);
      setReshareOpen(false);
      setReshareComment("");
      onUpdate?.();
    } catch (e) {
      console.error("Reshare error:", e);
    } finally {
      setReshareLoading(false);
    }
  }

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

  async function handleReply(parentId) {
    if (!user || !replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const commentId = await addComment(post.id, {
        authorId: user.uid,
        authorName: userProfile?.name || user.displayName || "Anonim",
        authorPhoto: userProfile?.photo || user.photoURL || "",
        content: replyText.trim(),
        parentId,
      });
      const newReply = {
        id: commentId,
        authorId: user.uid,
        authorName: userProfile?.name || user.displayName || "Anonim",
        authorPhoto: userProfile?.photo || user.photoURL || "",
        content: replyText.trim(),
        createdAt: new Date(),
        parentId,
        likesCount: 0,
      };
      setComments((prev) => [...prev, newReply]);
      setCommentLikesMap((prev) => ({ ...prev, [commentId]: { liked: false, count: 0 } }));
      setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
      setReplyText("");
      setReplyingToId(null);
    } catch (e) {
      console.error("Reply error:", e);
    } finally {
      setSubmittingReply(false);
    }
  }

  async function handleOriginalComment(e) {
    e.preventDefault();
    if (!user || !newOriginalComment.trim() || !post.originalPostId) return;
    setSubmittingOriginalComment(true);
    try {
      const commentId = await addComment(post.originalPostId, {
        authorId: user.uid,
        authorName: userProfile?.name || user.displayName || "Anonim",
        authorPhoto: userProfile?.photo || user.photoURL || "",
        content: newOriginalComment.trim(),
      });
      const newC = {
        id: commentId,
        authorId: user.uid,
        authorName: userProfile?.name || user.displayName || "Anonim",
        authorPhoto: userProfile?.photo || user.photoURL || "",
        content: newOriginalComment.trim(),
        createdAt: new Date(),
        likesCount: 0,
      };
      setOriginalPostComments((prev) => [...prev, newC]);
      setOriginalCommentLikesMap((prev) => ({ ...prev, [commentId]: { liked: false, count: 0 } }));
      setNewOriginalComment("");
    } catch (e) {
      console.error("Original comment error:", e);
    } finally {
      setSubmittingOriginalComment(false);
    }
  }

  async function handleOriginalCommentLike(commentId) {
    if (!user || !post.originalPostId) return;
    setOriginalCommentLikesMap((prev) => {
      const current = prev[commentId] || { liked: false, count: 0 };
      return { ...prev, [commentId]: { liked: !current.liked, count: current.liked ? Math.max(0, current.count - 1) : current.count + 1 } };
    });
    try {
      await toggleCommentLike(post.originalPostId, commentId, user.uid);
    } catch (e) {
      setOriginalCommentLikesMap((prev) => {
        const current = prev[commentId] || { liked: false, count: 0 };
        return { ...prev, [commentId]: { liked: !current.liked, count: current.liked ? Math.max(0, current.count - 1) : current.count + 1 } };
      });
    }
  }

  async function handleCommentLike(commentId) {
    if (!user) return;
    setCommentLikesMap((prev) => {
      const current = prev[commentId] || { liked: false, count: 0 };
      return { ...prev, [commentId]: { liked: !current.liked, count: current.liked ? Math.max(0, current.count - 1) : current.count + 1 } };
    });
    try {
      await toggleCommentLike(post.id, commentId, user.uid);
    } catch (e) {
      setCommentLikesMap((prev) => {
        const current = prev[commentId] || { liked: false, count: 0 };
        return { ...prev, [commentId]: { liked: !current.liked, count: current.liked ? Math.max(0, current.count - 1) : current.count + 1 } };
      });
    }
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
      const newCommentObj = {
        id: commentId,
        authorId: user.uid,
        authorName: userProfile?.name || user.displayName || "Anonim",
        authorPhoto: userProfile?.photo || user.photoURL || "",
        content: newComment.trim(),
        createdAt: new Date(),
        likesCount: 0,
      };
      setComments((prev) => [...prev, newCommentObj]);
      setCommentLikesMap((prev) => ({ ...prev, [commentId]: { liked: false, count: 0 } }));
      setLocalCommentsCount((prev) => prev + 1);
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
      const initMap = {};
      (loadedComments || []).forEach((c) => {
        initMap[c.id] = { liked: false, count: c.likesCount || 0 };
      });
      setCommentLikesMap(initMap);
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

  const topLevelComments = comments.filter((c) => !c.parentId);
  const repliesByParent = {};
  comments.forEach((c) => {
    if (c.parentId) {
      if (!repliesByParent[c.parentId]) repliesByParent[c.parentId] = [];
      repliesByParent[c.parentId].push(c);
    }
  });

  return (
    <>
    <Card className="overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-white/95 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.35)] transition-all duration-300 hover:shadow-[0_28px_65px_-42px_rgba(15,23,42,0.42)]">
      <CardContent className="p-4 sm:p-5 lg:p-6">
        {/* Reshare header */}
        {post.isReshare && (
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-400">
            <Repeat2 className="h-3.5 w-3.5 text-rose-400" />
            <span>{language === "ht" ? "te pataje" : "a repartagé"}</span>
          </div>
        )}
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
                           post.tag === 'community' ? (language === 'fr' ? 'Communauté' : 'Kominote') :
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
          {!post.isReshare && post.title ? (
            <h3 className="font-display break-words text-[1.12rem] font-semibold leading-[1.22] tracking-[-0.03em] text-slate-900 sm:text-[1.24rem]">
              {language === 'ht' ? 
                post.title.replace(/sommeil/gi, 'd\u00f2mi').replace(/alimentation/gi, 'alimantasyon') : 
                post.title}
            </h3>
          ) : null}
          {!post.isReshare && post.body ? (
            <p className="break-words text-[0.95rem] leading-7 text-slate-600 sm:text-[0.98rem]">
              {language === 'ht' ? 
                post.body.replace(/sommeil/gi, 'd\u00f2mi').replace(/alimentation/gi, 'alimantasyon') : 
                post.body}
            </p>
          ) : null}
          {post.isReshare && (
            <div>
              {post.body ? (
                <p className="mb-3 break-words text-[0.95rem] leading-7 text-slate-600">{post.body}</p>
              ) : null}
              <div
                className="cursor-pointer rounded-[1.3rem] border border-slate-200/80 bg-slate-50/70 p-4 transition hover:border-rose-200 hover:bg-rose-50/30"
                onClick={async () => {
                  setShowOriginalModal(true);
                  if (originalPostFetched) return;
                  setOriginalPostLoading(true);
                  try {
                    const [fetchedPost, fetchedComments] = await Promise.all([
                      getPost(post.originalPostId),
                      getComments(post.originalPostId),
                    ]);
                    setOriginalPostFetched(fetchedPost || null);
                    setOriginalPostComments(fetchedComments || []);
                    const initMap = {};
                    (fetchedComments || []).forEach((c) => {
                      initMap[c.id] = { liked: false, count: c.likesCount || 0 };
                    });
                    setOriginalCommentLikesMap(initMap);
                  } catch (e) {
                    console.error("Error loading original post:", e);
                  } finally {
                    setOriginalPostLoading(false);
                  }
                }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    {post.originalAuthorPhoto && (
                      <AvatarImage src={post.originalAuthorPhoto} onError={(e) => { e.target.style.display = 'none'; }} />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-rose-300 to-pink-400 text-[10px] text-white">
                      {getInitials(post.originalAuthorName || "?")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold text-slate-800">{post.originalAuthorName}</span>
                  {post.originalPostGroupName ? (
                    <span className="rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5 text-[11px] text-rose-600">{post.originalPostGroupName}</span>
                  ) : null}
                </div>
                {post.originalPostTitle ? (
                  <h4 className="mb-1 break-words text-[0.96rem] font-semibold leading-5 text-slate-800">{post.originalPostTitle}</h4>
                ) : null}
                {post.originalPostBody ? (
                  <p className="break-words text-sm leading-6 text-slate-600 line-clamp-4">{post.originalPostBody}</p>
                ) : null}
                {Array.isArray(post.originalPostImages) && post.originalPostImages.length > 0 ? (
                  <div className="mt-3 overflow-hidden rounded-[1rem] border border-slate-100">
                    <img
                      src={typeof post.originalPostImages[0] === "string" ? post.originalPostImages[0] : post.originalPostImages[0]?.url}
                      alt=""
                      className="max-h-48 w-full object-cover"
                    />
                  </div>
                ) : null}
                <div className="mt-3 text-xs font-medium text-rose-500">
                  {language === "ht" ? "Wè piblikasyon orijinal la →" : "Voir la publication originale →"}
                </div>
              </div>
            </div>
          )}
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
            <MessageCircle className="h-4 w-4" /> {localCommentsCount}
            {showComments ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
          <div className="relative" ref={shareMenuRef}>
            <button
              onClick={() => setShareMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-xs font-medium transition-all hover:bg-slate-100 hover:shadow-sm sm:px-3.5 sm:text-sm"
            >
              {linkCopied ? (
                <><CheckCheck className="h-4 w-4 text-green-600" /> <span className="text-green-600">{t("linkCopied") || "Copié !"}</span></>
              ) : (
                <><Share2 className="h-4 w-4" /> {t("share") || "Partager"} {sharesCount > 0 && <span className="ml-0.5 text-slate-400">{sharesCount}</span>}</>
              )}
            </button>
            {shareMenuOpen && (
              <div className="absolute bottom-full left-0 z-50 mb-2 w-52 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)]">
                <button
                  onClick={handleCopyLink}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <Link className="h-4 w-4 shrink-0 text-slate-400" />
                  {t("copyLink") || "Copier le lien"}
                </button>
                <button
                  onClick={handleWhatsAppShareFromMenu}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-green-700 transition hover:bg-green-50"
                >
                  <Send className="h-4 w-4 shrink-0 text-green-500" />
                  WhatsApp
                </button>
                <button
                  onClick={handleEmailShareFromMenu}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                  {t("shareByEmail") || "Par email"}
                </button>
                {user && (
                  <button
                    onClick={() => { setShareMenuOpen(false); setReshareOpen(true); }}
                    className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm text-rose-700 transition hover:bg-rose-50"
                  >
                    <Repeat2 className="h-4 w-4 shrink-0 text-rose-400" />
                    {t("reshare") || "Repartager ici"}
                  </button>
                )}
                {typeof navigator !== "undefined" && navigator.share && (
                  <button
                    onClick={handleNativeShare}
                    className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <Share2 className="h-4 w-4 shrink-0 text-slate-400" />
                    {t("shareMore") || "Plus d'options"}
                  </button>
                )}
              </div>
            )}
          </div>
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

        {/* Reshare form */}
        {reshareOpen && !reshared && (
          <div className="mt-4 rounded-[1.3rem] border border-rose-100 bg-rose-50/60 p-4">
            <div className="relative">
              <textarea
                className="w-full resize-none rounded-[1rem] border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-200"
                rows={2}
                placeholder={t("reshareCommentPlaceholder") || "Ajouter un commentaire (optionnel)"}
                value={reshareComment}
                onChange={(e) => setReshareComment(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setReshareEmojiOpen((v) => !v)}
                className="absolute right-2.5 top-2.5 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-rose-500"
              >
                <Smile className="h-4 w-4" />
              </button>
              {reshareEmojiOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 flex flex-wrap gap-1 rounded-[1.1rem] border border-slate-100 bg-white p-2 shadow-lg" style={{width: '220px'}}>
                  {COMMENT_EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setReshareComment((prev) => prev + emoji);
                        setReshareEmojiOpen(false);
                      }}
                      className="rounded-lg p-1 text-base transition hover:bg-rose-50"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {post.groupId ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setReshareDestination("feed")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    reshareDestination === "feed" ? "border-rose-300 bg-rose-100 text-rose-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {language === "ht" ? "Feed la" : "Feed principal"}
                </button>
                <button
                  type="button"
                  onClick={() => setReshareDestination("group")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    reshareDestination === "group" ? "border-rose-300 bg-rose-100 text-rose-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {language === "ht" ? `Gwoup: ${post.groupName || post.groupId}` : `Groupe : ${post.groupName || post.groupId}`}
                </button>
              </div>
            ) : null}
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => { setReshareOpen(false); setReshareComment(""); setReshareDestination("feed"); }}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                {t("cancel") || "Annuler"}
              </button>
              <button
                onClick={handleReshare}
                disabled={reshareLoading}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-700 to-rose-800 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-rose-800 hover:to-rose-900 disabled:opacity-60"
              >
                <Repeat2 className="h-3.5 w-3.5" />
                {reshareLoading ? (t("loading") || "...") : (t("reshare") || "Repartager")}
              </button>
            </div>
          </div>
        )}
        {reshared && (
          <div className="mt-3 flex items-center gap-2 rounded-[1rem] border border-green-100 bg-green-50 px-3 py-2.5 text-sm text-green-700">
            <Repeat2 className="h-4 w-4" />
            {t("reshared") || "Publication repartagée !"}
          </div>
        )}

        {/* Comments section */}
        {showComments && (
          <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
            {commentsLoading ? (
              <div className="rounded-[1.1rem] border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-500">
                {postDialogUi.loadingComments}
              </div>
            ) : null}
            {topLevelComments.map((comment) => (
              <div key={comment.id}>
                <div className="flex gap-3">
                  <Avatar className="h-7 w-7">
                    {comment.authorPhoto && <AvatarImage src={comment.authorPhoto} onError={(e) => { e.target.style.display = "none"; }} />}
                    <AvatarFallback className="bg-gradient-to-br from-rose-200 to-pink-300 text-[10px] text-white">
                      {getInitials(comment.authorName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 rounded-[1.1rem] border border-slate-100 bg-slate-50/80 p-3">
                    <div className="flex items-center gap-2">
                      <span className="break-words text-sm font-medium">{comment.authorName}</span>
                      <span className="text-xs text-slate-400">{formatDate(comment.createdAt, language)}</span>
                    </div>
                    <p className="mt-1 break-words text-sm text-slate-600">{comment.content}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => { setReplyingToId(replyingToId === comment.id ? null : comment.id); setReplyText(""); }}
                        className={`text-xs transition ${ replyingToId === comment.id ? "font-semibold text-rose-500" : "text-slate-400 hover:text-rose-500"}`}
                      >
                        {language === "ht" ? "Reponn" : "Répondre"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCommentLike(comment.id)}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-all ${
                          commentLikesMap[comment.id]?.liked ? "bg-rose-100 text-rose-600" : "text-slate-400 hover:bg-rose-50 hover:text-rose-400"
                        }`}
                      >
                        <Heart className={`h-3 w-3 ${commentLikesMap[comment.id]?.liked ? "fill-current" : ""}`} />
                        {commentLikesMap[comment.id]?.count > 0 && <span>{commentLikesMap[comment.id].count}</span>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Replies toggle */}
                {repliesByParent[comment.id]?.length > 0 && (
                  <div className="ml-9 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setExpandedReplies((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                      className="text-xs font-medium text-rose-500 hover:underline"
                    >
                      {expandedReplies[comment.id]
                        ? (language === "ht" ? "Kache repons yo" : "Masquer les réponses")
                        : (language === "ht"
                            ? `Wè ${repliesByParent[comment.id].length} repons`
                            : `Voir ${repliesByParent[comment.id].length} réponse${repliesByParent[comment.id].length > 1 ? "s" : ""}`)
                      }
                    </button>
                  </div>
                )}

                {/* Replies list */}
                {expandedReplies[comment.id] && repliesByParent[comment.id]?.map((reply) => (
                  <div key={reply.id} className="ml-9 mt-2 flex gap-2">
                    <Avatar className="h-6 w-6 shrink-0">
                      {reply.authorPhoto && <AvatarImage src={reply.authorPhoto} onError={(e) => { e.target.style.display = "none"; }} />}
                      <AvatarFallback className="bg-gradient-to-br from-rose-200 to-pink-300 text-[9px] text-white">
                        {getInitials(reply.authorName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 rounded-[1rem] border border-slate-100 bg-white px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800">{reply.authorName}</span>
                        <span className="text-[10px] text-slate-400">{formatDate(reply.createdAt, language)}</span>
                      </div>
                      <p className="mt-0.5 break-words text-xs text-slate-600">{reply.content}</p>
                      <div className="mt-1.5 flex items-center">
                        <button
                          type="button"
                          onClick={() => handleCommentLike(reply.id)}
                          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-all ${
                            commentLikesMap[reply.id]?.liked ? "bg-rose-100 text-rose-600" : "text-slate-400 hover:bg-rose-50 hover:text-rose-400"
                          }`}
                        >
                          <Heart className={`h-2.5 w-2.5 ${commentLikesMap[reply.id]?.liked ? "fill-current" : ""}`} />
                          {commentLikesMap[reply.id]?.count > 0 && <span>{commentLikesMap[reply.id].count}</span>}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Inline reply input */}
                {replyingToId === comment.id && (
                  <div className="ml-9 mt-2 flex items-center gap-2">
                    <Avatar className="h-6 w-6 shrink-0">
                      {(userProfile?.photo || user?.photoURL) && <AvatarImage src={userProfile?.photo || user.photoURL} onError={(e) => { e.target.style.display = "none"; }} />}
                      <AvatarFallback className="bg-gradient-to-br from-rose-300 to-pink-400 text-[9px] text-white">
                        {getInitials(userProfile?.name || user?.displayName || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-1 items-center gap-2 rounded-[1rem] border border-rose-200 bg-white px-3 py-1.5 focus-within:border-rose-400 focus-within:ring-1 focus-within:ring-rose-200">
                      <input
                        type="text"
                        autoFocus
                        className="flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                        placeholder={language === "ht" ? `Reponn ${comment.authorName}...` : `Répondre à ${comment.authorName}...`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(comment.id); } }}
                        disabled={submittingReply}
                      />
                      <button
                        type="button"
                        onClick={() => handleReply(comment.id)}
                        disabled={submittingReply || !replyText.trim()}
                        className="rounded-full p-1 text-rose-500 transition hover:text-rose-700 disabled:opacity-40"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {user && (
              <form onSubmit={handleComment} className="space-y-2">
                <div className="flex items-start gap-2">
                  <Textarea
                    ref={commentTextareaRef}
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

      {showOriginalModal && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowOriginalModal(false); }}
        >
          <div className="relative flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-[0_-20px_60px_-20px_rgba(15,23,42,0.4)] sm:rounded-[2rem] sm:h-[85vh]">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
              <span className="text-[0.95rem] font-semibold text-slate-800">
                {language === "ht" ? "Piblikasyon orijinal la" : "Publication originale"}
              </span>
              <button
                onClick={() => setShowOriginalModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-rose-50 hover:text-rose-500"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {originalPostLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-400">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-300 border-t-transparent" />
                </div>
              ) : originalPostFetched ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-rose-100">
                      {originalPostFetched.authorPhoto && <AvatarImage src={originalPostFetched.authorPhoto} onError={(e) => { e.target.style.display = "none"; }} />}
                      <AvatarFallback className="bg-gradient-to-br from-rose-300 to-pink-400 text-sm text-white">
                        {getInitials(originalPostFetched.authorName || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{originalPostFetched.authorName}</div>
                      <div className="text-xs text-slate-400">{formatDate(originalPostFetched.createdAt)}</div>
                    </div>
                  </div>

                  {originalPostFetched.title ? (
                    <h3 className="text-[1.05rem] font-semibold leading-6 text-slate-900">{originalPostFetched.title}</h3>
                  ) : null}
                  {originalPostFetched.body ? (
                    <p className="break-words text-sm leading-7 text-slate-700">{originalPostFetched.body}</p>
                  ) : null}
                  {Array.isArray(originalPostFetched.images) && originalPostFetched.images.filter(Boolean).length > 0 ? (
                    <div className={`grid gap-2 ${originalPostFetched.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                      {originalPostFetched.images.filter(Boolean).map((img, idx) => {
                        const src = typeof img === "string" ? img : img?.url;
                        return src ? (
                          <div key={idx} className="relative overflow-hidden rounded-[1.2rem] aspect-video">
                            <Image src={src} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
                          </div>
                        ) : null;
                      })}
                    </div>
                  ) : null}

                  {originalPostComments.length > 0 ? (
                    <div className="mt-2 space-y-3 border-t border-slate-100 pt-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {language === "ht" ? "Kòmantè yo" : "Commentaires"} ({originalPostComments.length})
                      </div>
                      {originalPostComments.map((c) => (
                        <div key={c.id} className="flex gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            {c.authorPhoto && <AvatarImage src={c.authorPhoto} onError={(e) => { e.target.style.display = "none"; }} />}
                            <AvatarFallback className="bg-gradient-to-br from-rose-200 to-pink-300 text-[10px] text-white">
                              {getInitials(c.authorName || "?")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1 rounded-[1.1rem] bg-slate-50 px-3.5 py-2.5">
                            <div className="mb-0.5 text-xs font-semibold text-slate-800">{c.authorName}</div>
                            <p className="break-words text-sm text-slate-600">{c.content || c.body}</p>
                            <div className="mt-2 flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setNewOriginalComment(`@${c.authorName} `);
                                  modalCommentInputRef.current?.focus();
                                }}
                                className="text-xs text-slate-400 transition hover:text-rose-500"
                              >
                                {language === "ht" ? "Reponn" : "Répondre"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOriginalCommentLike(c.id)}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-all ${
                                  originalCommentLikesMap[c.id]?.liked
                                    ? "bg-rose-100 text-rose-600"
                                    : "text-slate-400 hover:bg-rose-50 hover:text-rose-400"
                                }`}
                              >
                                <Heart className={`h-3 w-3 ${originalCommentLikesMap[c.id]?.liked ? "fill-current" : ""}`} />
                                {originalCommentLikesMap[c.id]?.count > 0 && (
                                  <span>{originalCommentLikesMap[c.id].count}</span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 border-t border-slate-100 pt-4 text-sm text-slate-400">
                      {language === "ht" ? "Pa gen kòmantè." : "Pas encore de commentaires."}
                    </div>
                  )}

                  {user && (
                    <form onSubmit={handleOriginalComment} className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-4">
                      <Avatar className="h-8 w-8 shrink-0">
                        {(userProfile?.photo || user.photoURL) && (
                          <AvatarImage src={userProfile?.photo || user.photoURL} onError={(e) => { e.target.style.display = "none"; }} />
                        )}
                        <AvatarFallback className="bg-gradient-to-br from-rose-300 to-pink-400 text-[10px] text-white">
                          {getInitials(userProfile?.name || user.displayName || "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-1 items-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white px-3 py-2 focus-within:border-rose-300 focus-within:ring-1 focus-within:ring-rose-200">
                        <input
                          ref={modalCommentInputRef}
                          type="text"
                          className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                          placeholder={language === "ht" ? "Ekri yon kòmantè..." : "Écrire un commentaire..."}
                          value={newOriginalComment}
                          onChange={(e) => setNewOriginalComment(e.target.value)}
                          disabled={submittingOriginalComment}
                        />
                        <button
                          type="submit"
                          disabled={submittingOriginalComment || !newOriginalComment.trim()}
                          className="rounded-full p-1 text-rose-500 transition hover:text-rose-700 disabled:opacity-40"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center text-sm text-slate-400">
                  {language === "ht" ? "Piblikasyon sa a pa disponib." : "Cette publication n'est plus disponible."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

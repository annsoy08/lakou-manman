"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { getInitials, formatDate } from "@/lib/utils";
import { toggleLike, savePost, addComment, reportPost, createConversation } from "@/lib/firestore";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Send,
  ShieldCheck,
  Star,
  Flag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function PostCard({ post, comments: initialComments = [], onUpdate }) {
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      router.push("/messages");
    } catch (e) {
      console.error("Error creating conversation:", e);
      alert(t("conversationError"));
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
      setNewComment("");
    } catch (e) {
      console.error("Comment error:", e);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReport() {
    if (!user) return;
    if (window.confirm("Ou vle rapòte pòs sa a?")) {
      try {
        await reportPost(post.id, user.uid, "Reported by user");
      } catch (e) {
        console.error("Report error:", e);
      }
    }
  }

  return (
    <Card className="rounded-[1.5rem] border-0 shadow-sm transition-all hover:shadow-md">
      <CardContent className="p-6">
        {/* Author info */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-rose-100">
              {post.authorPhoto && <AvatarImage src={post.authorPhoto} />}
              <AvatarFallback className="bg-gradient-to-br from-rose-400 to-pink-500 text-white">
                {getInitials(post.authorName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <button
                onClick={() => router.push(`/profile/${post.authorId}`)}
                className="font-medium text-slate-900 hover:text-rose-600 transition-colors"
              >
                {post.authorName}
              </button>
              <div className="text-xs text-slate-500">
                {formatDate(post.createdAt)}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {post.location && `${post.location} • `}
                {post.childAge && `Tibebe: ${post.childAge} • `}
                {post.groupName && `Gwoup: ${post.groupName}`}
                {post.createdAt && ` • ${formatDate(post.createdAt)}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {post.tag && (
              <Badge variant="secondary" className="rounded-full bg-rose-50 text-rose-600">
                {post.tag}
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
        <h3 className="mt-4 text-lg font-semibold tracking-tight">{post.title}</h3>
        <p className="mt-2 text-sm leading-7 text-slate-500">{post.body}</p>

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
            onClick={() => setShowComments(!showComments)}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-50/70 px-3.5 py-1.5 transition-all hover:bg-slate-100 hover:shadow-sm"
          >
            <MessageCircle className="h-4 w-4" /> {post.commentsCount || comments.length}
            {showComments ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
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
              <Flag className="h-4 w-4" /> <span className="hidden sm:inline">Rapòte</span>
            </button>
          )}
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
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
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{comment.content}</p>
                </div>
              </div>
            ))}

            {user && (
              <form onSubmit={handleComment} className="flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ekri yon kòmantè..."
                  className="flex-1 rounded-xl"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting || !newComment.trim()}
                  className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 shadow-sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

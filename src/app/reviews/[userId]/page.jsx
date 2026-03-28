"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { createReview, getUserReviews, getUserRating, hasUserReviewed } from "@/lib/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import StarRating, { RatingDisplay } from "@/components/ui/StarRating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Star } from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import Link from "next/link";

export default function ReviewsPage({ params }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [reviews, setReviews] = useState([]);
  const [userRating, setUserRating] = useState({ average: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    comment: "",
  });
  const reviewsUi = language === "ht"
    ? {
        backToShop: "Retounen boutik la",
        sellerReviewsTitle: "Evalyasyon vandè a",
        reviewCount: "evalyasyon",
        reviewSeller: "Evalye vandè a",
        updateReview: "Mete ajou evalyasyon ou",
        ratingLabel: "Nòt",
        commentLabel: "Kòmantè",
        commentPlaceholder: "Dekri eksperyans ou ak vandè a...",
        submit: "Soumèt evalyasyon an",
        submitting: "Ap soumèt...",
        cancel: "Anile",
        noReviewsTitle: "Pa gen evalyasyon ankò",
        noReviewsBody: "Vandè a pa gen evalyasyon ankò. Se ou menm ki ka premye moun ki evalye li!",
        sellerFallback: "Vandè",
        anonymous: "Anonim",
      }
    : {
        backToShop: "Retourner à la boutique",
        sellerReviewsTitle: "Évaluations du vendeur",
        reviewCount: "évaluation",
        reviewSeller: "Évaluer le vendeur",
        updateReview: "Mettre à jour votre évaluation",
        ratingLabel: "Note",
        commentLabel: "Commentaire",
        commentPlaceholder: "Décrivez votre expérience avec le vendeur...",
        submit: "Publier l'évaluation",
        submitting: "Envoi...",
        cancel: "Annuler",
        noReviewsTitle: "Pas encore d'évaluation",
        noReviewsBody: "Ce vendeur n'a pas encore d'évaluation. Soyez la première personne à l'évaluer !",
        sellerFallback: "Vendeur",
        anonymous: "Anonyme",
      };

  useEffect(() => {
    if (!params.userId) return;
    loadReviews();
  }, [params.userId]);

  async function loadReviews() {
    setLoading(true);
    try {
      const [reviewsData, ratingData] = await Promise.all([
        getUserReviews(params.userId),
        getUserRating(params.userId),
      ]);
      
      setReviews(reviewsData);
      setUserRating(ratingData);
      
      if (user && user.uid !== params.userId) {
        const reviewed = await hasUserReviewed(params.userId, user.uid);
        setHasReviewed(reviewed);
      }
    } catch (e) {
      console.error("Error loading reviews:", e);
    }
    setLoading(false);
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!user || !reviewForm.rating || !reviewForm.comment.trim()) return;
    
    setSubmitting(true);
    try {
      await createReview({
        reviewerId: user.uid,
        reviewerName: user.displayName || "Anonim",
        revieweeId: params.userId,
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
      });
      
      setReviewForm({ rating: 0, comment: "" });
      setShowReviewForm(false);
      setHasReviewed(true);
      await loadReviews();
    } catch (e) {
      console.error("Error creating review:", e);
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#9B2335] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/boutique" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          {reviewsUi.backToShop}
        </Link>
        
        <div className="mt-4 rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600 text-lg">
                {getInitials(reviewsUi.sellerFallback)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold">{reviewsUi.sellerReviewsTitle}</h1>
              <div className="mt-2 flex items-center gap-4">
                <RatingDisplay userId={params.userId} size="lg" />
                <Badge variant="secondary" className="rounded-full">
                  {userRating.count} {reviewsUi.reviewCount}{userRating.count > 1 ? "s" : ""}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Review Button */}
      {user && user.uid !== params.userId && !hasReviewed && (
        <div className="mb-6">
          <Button
            onClick={() => setShowReviewForm(!showReviewForm)}
            className="rounded-xl bg-gradient-to-r from-[#9B2335] to-[#7B1A2C]"
          >
            <Star className="mr-2 h-4 w-4" />
            {hasReviewed ? reviewsUi.updateReview : reviewsUi.reviewSeller}
          </Button>
        </div>
      )}

      {/* Review Form */}
      {showReviewForm && (
        <Card className="mb-6 rounded-3xl border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="mb-4 font-semibold">{reviewsUi.reviewSeller}</h3>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">{reviewsUi.ratingLabel}</label>
                <StarRating
                  rating={reviewForm.rating}
                  onChange={(rating) => setReviewForm({ ...reviewForm, rating })}
                  size="lg"
                />
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-medium">{reviewsUi.commentLabel}</label>
                <Textarea
                  placeholder={reviewsUi.commentPlaceholder}
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  className="rounded-xl"
                  rows={4}
                  required
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={submitting || !reviewForm.rating || !reviewForm.comment.trim()}
                  className="rounded-xl bg-gradient-to-r from-[#9B2335] to-[#7B1A2C]"
                >
                  {submitting ? reviewsUi.submitting : reviewsUi.submit}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReviewForm(false)}
                  className="rounded-xl"
                >
                  {reviewsUi.cancel}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <Card className="rounded-3xl border-0 bg-gradient-to-br from-slate-50 to-slate-100 p-12 text-center">
          <Star className="mx-auto h-16 w-16 text-slate-300" />
          <h2 className="mt-4 text-xl font-semibold text-slate-700">{reviewsUi.noReviewsTitle}</h2>
          <p className="mt-2 text-slate-500">
            {reviewsUi.noReviewsBody}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600">
                      {getInitials(review.reviewerName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="font-medium">{review.reviewerName}</h4>
                        <div className="mt-1">
                          <StarRating rating={review.rating} size="sm" readonly />
                        </div>
                      </div>
                      <span className="text-sm text-slate-400">
                        {formatDate(review.createdAt, language)}
                      </span>
                    </div>
                    
                    {review.comment && (
                      <p className="mt-3 text-slate-700">{review.comment}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

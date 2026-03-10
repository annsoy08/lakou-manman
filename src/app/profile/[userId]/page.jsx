"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getUserProfile } from "@/lib/firestore";
import { createConversation } from "@/lib/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, formatDate } from "@/lib/utils";
import { MessageCircle, MapPin, Baby, Calendar, ArrowLeft } from "lucide-react";

export default function UserProfilePage() {
  const { userId } = useParams();
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [targetUser, setTargetUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  async function loadUserProfile() {
    if (!userId) return;
    setLoading(true);
    try {
      const userData = await getUserProfile(userId);
      setTargetUser(userData);
    } catch (e) {
      console.error("Error loading user profile:", e);
    }
    setLoading(false);
  }

  async function handleMessageUser() {
    if (!user || user.uid === userId || !targetUser) return;
    setMessageLoading(true);
    try {
      const conversationId = await createConversation([user.uid, userId]);
      router.push("/messages");
    } catch (e) {
      console.error("Error creating conversation:", e);
      alert(t("conversationError"));
    }
    setMessageLoading(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-200 border-t-rose-600 mx-auto"></div>
          <p className="mt-2 text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md rounded-3xl border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <p className="text-slate-500">User not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwnProfile = user && user.uid === userId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mx-auto max-w-4xl">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <Card className="rounded-[2rem] border-0 shadow-lg overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-rose-400 to-pink-500"></div>
                <CardContent className="relative px-8 pb-8">
                  <div className="absolute -top-16 left-8">
                    <Avatar className="h-32 w-32 ring-4 ring-white shadow-xl">
                      {targetUser.photo && <AvatarImage src={targetUser.photo} />}
                      <AvatarFallback className="bg-gradient-to-br from-rose-400 to-pink-500 text-white text-2xl">
                        {getInitials(targetUser.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  <div className="pt-20 space-y-4">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900">{targetUser.name}</h1>
                      <div className="flex items-center gap-2 mt-1 text-slate-500">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">
                          {targetUser.city || "Diaspora"}
                          {targetUser.country && `, ${targetUser.country}`}
                        </span>
                      </div>
                    </div>

                    {targetUser.childAges && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Baby className="h-4 w-4" />
                        <span className="text-sm">{targetUser.childAges}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">{t("memberSince")} {formatDate(targetUser.createdAt)}</span>
                    </div>

                    {targetUser.badges && targetUser.badges.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {targetUser.badges.map((badge, index) => (
                          <Badge key={index} variant="secondary" className="rounded-full">
                            {badge}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {!isOwnProfile && user && (
                      <Button
                        onClick={handleMessageUser}
                        disabled={messageLoading}
                        className="w-full rounded-xl bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] text-white"
                      >
                        {messageLoading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            {t("sendMessage")}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bio Section */}
            <div className="lg:col-span-2">
              <Card className="rounded-[2rem] border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>{t("userProfile")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {targetUser.bio ? (
                    <div className="prose prose-slate max-w-none">
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {targetUser.bio}
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">{t("noBio")}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

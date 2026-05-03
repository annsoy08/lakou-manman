"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateProfile as updateAuthProfile } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { updateUserProfile } from "@/lib/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, resolveProfilePhoto, resolveUserDisplayName } from "@/lib/utils";
import { User, Save, Camera, MapPin, Baby } from "lucide-react";

export default function ProfilePage() {
  const { user, userProfile, loading: authLoading, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const resolvedDisplayName = resolveUserDisplayName(userProfile, user, t("member"));
  const [localPhoto, setLocalPhoto] = useState("");
  const profilePhoto = localPhoto || resolveProfilePhoto(
    userProfile?.photo,
    user?.photoURL,
    userProfile?.photoUpdatedAt || userProfile?.updatedAt
  );
  const [form, setForm] = useState({
    name: "",
    city: "",
    country: "",
    childAges: "",
    bio: "",
    groupPostEmailNotifications: true,
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (userProfile) {
      setForm({
        name: resolveUserDisplayName(userProfile, user, ""),
        city: userProfile.city || "",
        country: userProfile.country || "",
        childAges: userProfile.childAges || "",
        bio: userProfile.bio || "",
        groupPostEmailNotifications: userProfile.groupPostEmailNotifications !== false,
      });
    }
    if (userProfile?.photo || user?.photoURL) {
      setLocalPhoto("");
    }
  }, [userProfile, user]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim()) return;
    setSaving(true);
    setSuccess(false);
    try {
      await updateUserProfile(user.uid, {
        ...form,
        name: form.name.trim(),
      });
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const storage = getFirebaseStorage();
    if (!storage) {
      console.error("Firebase storage not available");
      return;
    }
    setUploading(true);
    try {
      const extension = file.name?.split(".").pop()?.toLowerCase() || "jpg";
      const photoVersion = Date.now();
      const storageRef = ref(storage, `avatars/${user.uid}/${photoVersion}.${extension}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setLocalPhoto(resolveProfilePhoto(url, "", photoVersion));
      await Promise.all([
        updateUserProfile(user.uid, {
          photo: url,
          photoUpdatedAt: photoVersion,
          email: user.email || userProfile?.email || "",
          name: resolvedDisplayName,
          displayName: resolvedDisplayName,
          fullName: resolvedDisplayName,
          role: userProfile?.role || "user",
        }),
        updateAuthProfile(user, { photoURL: url }),
      ]);
      await refreshProfile();
    } catch (err) {
      console.error("Upload error:", err);
      setLocalPhoto("");
    } finally {
      setUploading(false);
    }
  }

  if (authLoading) {
    return <div className="py-12 text-center text-slate-500">{t("loadingProfile")}</div>;
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200">
          <User className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t("myProfile")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("profileDesc")}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Profile card */}
        <Card className="rounded-[2rem] border-0 shadow-sm">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <div className="relative">
              <Avatar className="h-24 w-24">
                {profilePhoto && <AvatarImage src={profilePhoto} />}
                <AvatarFallback className="bg-gradient-to-br from-rose-400 to-pink-500 text-white text-2xl">
                  {getInitials(resolvedDisplayName || "U")}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-rose-500 text-white shadow-md hover:bg-rose-600">
                <Camera className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>
            {uploading && (
              <p className="mt-2 text-xs text-slate-500">{t("uploadingPhoto")}</p>
            )}
            <h2 className="mt-4 w-full break-words text-center text-xl font-semibold">{resolvedDisplayName}</h2>
            <div className="mt-1 flex w-full items-center justify-center gap-1 break-words text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 break-words">{userProfile?.city || "Diaspora"}{userProfile?.country ? `, ${userProfile.country}` : ""}</span>
            </div>
            {userProfile?.childAges && (
              <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                <Baby className="h-3.5 w-3.5" />
                {userProfile.childAges}
              </div>
            )}
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {userProfile?.badges?.map((badge) => (
                <Badge key={badge} className="rounded-full bg-rose-100 text-rose-700">
                  {badge}
                </Badge>
              ))}
              {(!userProfile?.badges || userProfile.badges.length === 0) && (
                <Badge variant="outline" className="rounded-full">{t("member")}</Badge>
              )}
            </div>
            {userProfile?.bio && (
              <p className="mt-4 text-sm leading-6 text-slate-600">{userProfile.bio}</p>
            )}
          </CardContent>
        </Card>

        {/* Edit form */}
        <Card className="rounded-[2rem] border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("editProfile")}</CardTitle>
            <CardDescription>{t("editProfileDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              {success && (
                <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                  {t("profileUpdated")}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">{t("nameOrPseudo")}</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  required
                  className="rounded-xl"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">{t("city")}</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">{t("country")}</Label>
                  <Input
                    id="country"
                    value={form.country}
                    onChange={(e) => updateField("country", e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="childAges">{t("childrenAges")}</Label>
                <Input
                  id="childAges"
                  value={form.childAges}
                  onChange={(e) => updateField("childAges", e.target.value)}
                  placeholder={t("childrenAgesExample")}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">{t("bio")}</Label>
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  placeholder={t("bioPlaceholder")}
                  className="min-h-[100px] rounded-xl"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start gap-3">
                  <input
                    id="groupPostEmailNotifications"
                    type="checkbox"
                    checked={Boolean(form.groupPostEmailNotifications)}
                    onChange={(e) => updateField("groupPostEmailNotifications", e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="groupPostEmailNotifications" className="text-sm font-medium text-slate-900">
                      {t("groupPostEmailNotificationsLabel")}
                    </Label>
                    <p className="text-sm leading-6 text-slate-500">{t("groupPostEmailNotificationsHint")}</p>
                  </div>
                </div>
              </div>

              <Button type="submit" className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 shadow-sm shadow-rose-200 transition-all hover:shadow-md hover:shadow-rose-300" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? t("saving") + "..." : t("save")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

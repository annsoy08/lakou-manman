"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserPlus } from "lucide-react";

export default function RegisterPage() {
  const { register, signInWithGoogle, user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    city: "",
    country: "",
    childAges: "",
    bio: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  if (authLoading || user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-sm text-slate-500">
        {t("loading")}
      </div>
    );
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError(t("passwordsNotMatch"));
      return;
    }
    if (!form.name.trim()) {
      setError(t("nameRequired"));
      return;
    }
    if (!form.email.trim()) {
      setError(t("emailRequired"));
      return;
    }
    if (form.password.length < 6) {
      setError(t("passwordMinLength"));
      return;
    }

    setLoading(true);
    try {
      await register(form.email, form.password, {
        name: form.name.trim(),
        city: form.city,
        country: form.country,
        childAges: form.childAges,
        bio: form.bio,
      });
      router.replace("/");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError(t("emailAlreadyInUse"));
      } else if (err.code === "auth/missing-email") {
        setError(t("emailRequired"));
      } else if (err.code === "auth/missing-name") {
        setError(t("nameRequired"));
      } else if (err.code === "auth/weak-password") {
        setError(t("passwordTooWeak"));
      } else if (err.code === "auth/network-request-failed") {
        setError(t("networkError"));
      } else {
        setError(t("genericError"));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    setError("");
    setLoading(true);

    try {
      await signInWithGoogle();
      router.replace("/");
    } catch (err) {
      if (err.code === "auth/missing-email") {
        setError(t("googleAccountEmailRequired"));
      } else if (err.code === "auth/operation-not-allowed") {
        setError(t("googleSignInNotEnabled"));
      } else if (err.code === "auth/network-request-failed") {
        setError(t("networkError"));
      } else if (err.code === "auth/popup-closed-by-user") {
        setError("");
      } else {
        setError(t("googleSignInFailed"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[70vh] items-center justify-center py-8">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-rose-200/40 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-pink-200/40 blur-3xl" />
      </div>
      <Card className="w-full max-w-lg rounded-[2rem] border-0 bg-white shadow-xl shadow-rose-100/50">
        <CardHeader className="text-center pb-2">
          <img src="/logo-lakou-manman.png" alt="Lakou Manman" className="mx-auto mb-4 h-24 w-auto" />
          <CardTitle className="font-display text-2xl">{t("createAccount")}</CardTitle>
          <CardDescription>{t("joinCommunity")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" className="mb-4 w-full rounded-xl" onClick={handleGoogleSignUp} disabled={loading}>
            {t("createAccountWithGoogle")}
          </Button>
          <div className="mb-4 text-center text-xs uppercase tracking-[0.2em] text-slate-400">{t("orContinueWithEmail")}</div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">{t("nameOrPseudo")} *</Label>
              <Input
                id="name"
                placeholder={t("nameExample")}
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                required
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("email")} *</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("emailExample")}
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
                className="rounded-xl"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">{t("password")} *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("passwordPlaceholder")}
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  required
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("confirmPassword")} *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t("confirmPasswordPlaceholder")}
                  value={form.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  required
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">{t("city")}</Label>
                <Input
                  id="city"
                  placeholder={t("cityExample")}
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">{t("country")}</Label>
                <Input
                  id="country"
                  placeholder={t("countryExample")}
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
                placeholder={t("childrenAgesExample")}
                value={form.childAges}
                onChange={(e) => updateField("childAges", e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">{t("bio")}</Label>
              <Textarea
                id="bio"
                placeholder={t("bioPlaceholder")}
                value={form.bio}
                onChange={(e) => updateField("bio", e.target.value)}
                className="min-h-[80px] rounded-xl"
              />
            </div>

            <Button type="submit" className="w-full rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 shadow-md shadow-rose-200 transition-all hover:shadow-lg hover:shadow-rose-300 hover:scale-[1.01]" disabled={loading}>
              <UserPlus className="mr-2 h-4 w-4" />
              {loading ? t("creatingAccount") + "..." : t("createMyAccount")}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-slate-500">
            {t("alreadyHaveAccount")}{" "}
            <Link href="/login" className="font-medium text-rose-600 hover:underline">
              {t("login")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

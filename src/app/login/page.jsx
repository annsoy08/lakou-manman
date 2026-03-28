"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const { login, signInWithGoogle, user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError(t("emailRequired"));
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError(t("invalidCredentials"));
      } else if (err.code === "auth/invalid-credential") {
        setError(t("invalidCredentials"));
      } else if (err.code === "auth/network-request-failed") {
        setError(t("networkError"));
      } else {
        setError(t("genericError"));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
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
    <div className="relative flex min-h-[70vh] items-center justify-center">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-rose-200/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-pink-200/40 blur-3xl" />
      </div>
      <Card className="w-full max-w-md rounded-[2rem] border-0 bg-white shadow-xl shadow-rose-100/50">
        <CardHeader className="text-center pb-2">
          <img src="/logo-lakou-manman.png" alt="Lakou Manman" className="mx-auto mb-4 h-24 w-auto" />
          <CardTitle className="font-display text-2xl">{t("welcomeBack")}</CardTitle>
          <CardDescription>{t("loginToAccount")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" className="mb-4 w-full rounded-xl" onClick={handleGoogleSignIn} disabled={loading}>
            {t("continueWithGoogle")}
          </Button>
          <div className="mb-4 text-center text-xs uppercase tracking-[0.2em] text-slate-400">{t("orContinueWithEmail")}</div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("emailExample")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("password")}</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-rose-600 hover:underline"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
            <Button type="submit" className="w-full rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 shadow-md shadow-rose-200 transition-all hover:shadow-lg hover:shadow-rose-300 hover:scale-[1.01]" disabled={loading}>
              <LogIn className="mr-2 h-4 w-4" />
              {loading ? t("loggingIn") + "..." : t("login")}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-slate-500">
            {t("noAccount")}{" "}
            <Link href="/register" className="font-medium text-rose-600 hover:underline">
              {t("createAccount")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

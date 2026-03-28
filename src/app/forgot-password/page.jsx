"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const { language } = useLanguage();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const content = language === "ht"
    ? {
        title: "Bliye modpas?",
        description: "Antre imèl ou epi n ap voye yon lyen pou w reyanitilize modpas ou.",
        userNotFound: "Pa gen kont ak imèl sa a.",
        network: "Gen yon pwoblèm koneksyon entènèt. Verifye rezo a epi eseye ankò.",
        generic: "Yon erè rive. Eseye ankò.",
        sentPrefix: "Nou voye yon imèl bay",
        sentSuffix: "Tcheke bwat imèl ou (ak spam).",
        email: "Imèl",
        send: "Voye lyen reyanitilizasyon",
        sending: "Ap voye...",
        back: "Retounen nan koneksyon",
      }
    : {
        title: "Mot de passe oublié ?",
        description: "Entrez votre e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.",
        userNotFound: "Aucun compte n'est associé à cet e-mail.",
        network: "Problème de connexion internet. Vérifiez votre réseau puis réessayez.",
        generic: "Une erreur s'est produite. Essayez à nouveau.",
        sentPrefix: "Nous avons envoyé un e-mail à",
        sentSuffix: "Vérifiez votre boîte de réception (et vos spams).",
        email: "E-mail",
        send: "Envoyer le lien de réinitialisation",
        sending: "Envoi...",
        back: "Retour à la connexion",
      };

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError(content.userNotFound);
      } else if (err.code === "auth/network-request-failed") {
        setError(content.network);
      } else {
        setError(content.generic);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md rounded-[2rem] bg-white">
        <CardHeader className="text-center">
          <img src="/logo-lakou-manman.png" alt="Lakou Manman" className="mx-auto mb-4 h-20 w-auto" />
          <CardTitle className="text-2xl">{content.title}</CardTitle>
          <CardDescription>{content.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                {content.sentPrefix} <strong>{email}</strong>. {content.sentSuffix}
              </div>
              <Link href="/login">
                <Button variant="outline" className="rounded-xl">
                  <ArrowLeft className="mr-2 h-4 w-4" /> {content.back}
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{content.email}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="manman@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-xl"
                />
              </div>
              <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                {loading ? content.sending : content.send}
              </Button>
              <div className="text-center">
                <Link href="/login" className="text-sm text-rose-600 hover:underline">
                  <ArrowLeft className="mr-1 inline h-3 w-3" /> {content.back}
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

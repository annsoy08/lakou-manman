"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Home, Mail, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("Pa gen kont ak imèl sa a.");
      } else {
        setError("Yon erè rive. Eseye ankò.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md rounded-[2rem]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50">
            <Mail className="h-6 w-6 text-rose-500" />
          </div>
          <CardTitle className="text-2xl">Bliye modpas?</CardTitle>
          <CardDescription>
            Antre imèl ou epi n ap voye yon lyen pou w reyanitilize modpas ou.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                Nou voye yon imèl bay <strong>{email}</strong>. Tcheke bwat imèl ou (ak spam).
              </div>
              <Link href="/login">
                <Button variant="outline" className="rounded-xl">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Retounen nan koneksyon
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Imèl</Label>
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
                {loading ? "Ap voye..." : "Voye lyen reyanitilizasyon"}
              </Button>
              <div className="text-center">
                <Link href="/login" className="text-sm text-rose-600 hover:underline">
                  <ArrowLeft className="mr-1 inline h-3 w-3" /> Retounen nan koneksyon
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

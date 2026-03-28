"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserProfile } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Lock, CheckCircle2 } from "lucide-react";

const ADMIN_SECRET = "lakoumanman2024";

export default function AdminSetupPage() {
  const { user, userProfile, refreshProfile } = useAuth();
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handlePromote() {
    setError("");
    if (secret !== ADMIN_SECRET) {
      setError("Kòd sekrè a pa kòrèk.");
      return;
    }
    if (!user) {
      setError("Ou dwe konekte anvan.");
      return;
    }
    setLoading(true);
    try {
      await updateUserProfile(user.uid, { role: "admin" });
      const updatedProfile = await refreshProfile();
      if (updatedProfile?.role !== "admin") {
        throw new Error("Le rôle admin n'a pas pu être confirmé.");
      }
      setSuccess(true);
    } catch (e) {
      setError("Erè: " + e.message);
    }
    setLoading(false);
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md rounded-3xl border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <Lock className="mx-auto h-12 w-12 text-slate-300" />
            <h1 className="mt-4 text-xl font-bold">Ou dwe konekte anvan</h1>
            <p className="mt-2 text-sm text-slate-500">
              Konekte ak kont ou, epi retounen isit pou aktive aksè admin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success || userProfile?.role === "admin") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md rounded-3xl border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="mt-4 text-xl font-bold">Ou se admin kounye a!</h1>
            <p className="mt-2 text-sm text-slate-500">
              Ou ka ale nan paj admin pou jere platfòm lan.
            </p>
            <Button
              className="mt-6 rounded-2xl bg-gradient-to-r from-[#9B2335] to-[#6B1525]"
              onClick={() => router.push("/admin")}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Ale nan Admin
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md rounded-3xl border-0 shadow-lg">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#9B2335] to-[#6B1525]">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <h1 className="mt-4 text-xl font-bold">Aktive aksè Admin</h1>
            <p className="mt-2 text-sm text-slate-500">
              Antre kòd sekrè a pou fè kont ou vin admin.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Kont: {userProfile?.name || user.email}
              </label>
              <Input
                type="password"
                placeholder="Antre kòd sekrè a..."
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="rounded-xl"
                onKeyDown={(e) => e.key === "Enter" && handlePromote()}
              />
            </div>
            {error && (
              <p className="text-sm font-medium text-red-600">{error}</p>
            )}
            <Button
              className="w-full rounded-2xl bg-gradient-to-r from-[#9B2335] to-[#6B1525]"
              onClick={handlePromote}
              disabled={loading || !secret}
            >
              {loading ? "Ap trete..." : "Aktive Admin"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

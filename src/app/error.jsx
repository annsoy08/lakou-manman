"use client";

import { useEffect, useState } from "react";
import { trackError } from "@/lib/telemetry";
import Link from "next/link";

export default function Error({ error, reset }) {
  const [isFr, setIsFr] = useState(true);

  useEffect(() => {
    const lang = typeof window !== "undefined" ? (localStorage.getItem("lakou-lang") || "fr") : "fr";
    setIsFr(lang !== "ht");
    trackError(error, { scope: "next_route_error" });
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-[2rem] border border-rose-100 bg-white p-8 text-center shadow-sm">
        <p className="text-5xl mb-4">😕</p>
        <h2 className="text-2xl font-semibold text-slate-900">
          {isFr ? "Une erreur est survenue" : "Yon erè te fèt"}
        </h2>
        <p className="mt-3 text-sm text-slate-500">
          {isFr
            ? "Cette page a rencontré un problème. Vous pouvez réessayer sans quitter l'application."
            : "Paj sa a rankontre yon pwoblèm. Ou ka eseye ankò san kite aplikasyon an."}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600"
          >
            {isFr ? "Réessayer" : "Eseye ankò"}
          </button>
          <Link
            href="/feed"
            className="inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            {isFr ? "Retour à l'accueil" : "Retounen lakay"}
          </Link>
        </div>
      </div>
    </div>
  );
}

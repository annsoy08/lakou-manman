"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotFound() {
  const [isFr, setIsFr] = useState(true);
  useEffect(() => {
    const lang = localStorage.getItem("lakou-lang") || "fr";
    setIsFr(lang !== "ht");
  }, []);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-[2rem] border border-slate-100 bg-white p-8 text-center shadow-sm">
        <p className="text-6xl font-black text-rose-400">404</p>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">
          {isFr ? "Page introuvable" : "Paj la pa egziste"}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {isFr
            ? "Cette page n'existe pas ou a été déplacée."
            : "Paj sa a pa egziste oswa li te deplase."}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/feed"
            className="inline-flex rounded-xl bg-rose-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-rose-600"
          >
            {isFr ? "Retour à l'accueil" : "Retounen lakay"}
          </Link>
          <Link
            href="/"
            className="inline-flex rounded-xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            {isFr ? "Page d'accueil" : "Paj akèy"}
          </Link>
        </div>
      </div>
    </div>
  );
}

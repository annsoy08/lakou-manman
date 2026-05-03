"use client";
import { useEffect, useState } from "react";

export default function GlobalLoading() {
  const [isFr, setIsFr] = useState(true);
  useEffect(() => {
    try { setIsFr((localStorage.getItem("lakou-lang") || "fr") !== "ht"); } catch {}
  }, []);

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-rose-200 border-t-rose-500" />
        <p className="text-sm text-slate-400">{isFr ? "Chargement…" : "Ap chaje…"}</p>
      </div>
    </div>
  );
}

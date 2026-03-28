"use client";

import { useEffect } from "react";
import { trackError } from "@/lib/telemetry";

export default function Error({ error, reset }) {
  useEffect(() => {
    trackError(error, {
      scope: "next_route_error",
    });
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-[2rem] border border-rose-100 bg-white p-8 text-center shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Une erreur est survenue</h2>
        <p className="mt-3 text-sm text-slate-500">
          Cette page a rencontré un problème. Vous pouvez réessayer sans quitter l'application.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

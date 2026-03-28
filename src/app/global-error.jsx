"use client";

import { useEffect } from "react";
import { trackError } from "@/lib/telemetry";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    trackError(error, {
      scope: "next_global_error",
    });
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center px-4 py-10">
          <div className="w-full max-w-lg rounded-[2rem] border border-rose-100 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">L'application a rencontré une erreur critique</h2>
            <p className="mt-3 text-sm text-slate-500">
              Vous pouvez tenter un nouveau rendu immédiatement.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-6 inline-flex rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600"
            >
              Relancer
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

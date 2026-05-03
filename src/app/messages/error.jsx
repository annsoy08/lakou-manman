"use client";

import { useEffect } from "react";
import { trackError } from "@/lib/telemetry";
import { MessageCircleOff } from "lucide-react";

export default function MessagesError({ error, reset }) {
  useEffect(() => {
    trackError(error, { scope: "messages_page_error" });
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-[2rem] border border-rose-100 bg-white p-8 text-center shadow-sm">
        <MessageCircleOff className="mx-auto h-10 w-10 text-rose-300" />
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Problème de chargement</h2>
        <p className="mt-2 text-sm text-slate-500">
          Les messages n&apos;ont pas pu être chargés. Vérifiez votre connexion et réessayez.
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

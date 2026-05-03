"use client";

import { useEffect, useState } from "react";
import { trackError } from "@/lib/telemetry";

export default function GlobalError({ error, reset }) {
  const [isFr, setIsFr] = useState(true);

  useEffect(() => {
    try {
      const lang = localStorage.getItem("lakou-lang") || "fr";
      setIsFr(lang !== "ht");
    } catch {}
    trackError(error, { scope: "next_global_error" });
  }, [error]);

  return (
    <html lang={isFr ? "fr" : "ht"}>
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#fff5f7" }}>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ maxWidth: 480, width: "100%", background: "#fff", borderRadius: 24, border: "1px solid #fce7f3", padding: "2.5rem", textAlign: "center", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 48, margin: "0 0 16px" }}>⚠️</p>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 12px" }}>
              {isFr ? "Erreur critique" : "Erè grav"}
            </h2>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px", lineHeight: 1.6 }}>
              {isFr
                ? "L'application a rencontré une erreur critique. Rechargez la page pour continuer."
                : "Aplikasyon an rankontre yon erè grav. Rechaje paj la pou kontinye."}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{ background: "#e11d48", color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                {isFr ? "Relancer" : "Rekòmanse"}
              </button>
              <button
                type="button"
                onClick={() => window.location.href = "/"}
                style={{ background: "#fff", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                {isFr ? "Accueil" : "Akèy"}
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

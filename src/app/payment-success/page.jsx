"use client";

import { useRouter } from "next/navigation";

export default function PaymentSuccessPage() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/boutique");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md mx-auto">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-green-800 mb-2">Paiement Réussi!</h1>
        <p className="text-slate-600 mb-6">Merci pour votre achat</p>
        <div className="space-y-3">
          <a 
            href="/boutique" 
            className="inline-block bg-[#9B2335] text-white px-6 py-3 rounded-xl hover:bg-[#7B1A2C] transition-colors w-full"
          >
            Retour à la boutique
          </a>
          <button
            type="button"
            onClick={handleBack}
            className="inline-block border-2 border-slate-300 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-50 transition-colors w-full"
          >
            Retour
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ActionDialog from "@/components/ui/action-dialog";
import { CheckCircle, Home, ShoppingBag, Download } from "lucide-react";
import Link from "next/link";

// Force client-side rendering
export const dynamic = 'force-dynamic';

export default function PaymentSuccessPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [receiptDialog, setReceiptDialog] = useState({
    open: false,
    tone: "info",
    title: "",
    message: "",
  });

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/boutique");
  };

  useEffect(() => {
    // Simulate loading completion
    const timer = setTimeout(() => {
      setLoading(false);
      
      // Get payment info from URL params
      const amount = searchParams.get('amount');
      const item = searchParams.get('item');
      
      if (amount || item) {
        setPaymentInfo({
          amount: amount || '0.00',
          itemName: item || 'Article'
        });
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchParams]);

  const generateReceipt = () => {
    try {
      const currentLang = typeof window !== 'undefined' ? localStorage.getItem('language') || 'fr' : 'fr';
      
      const amount = paymentInfo?.amount || '0.00';
      const itemName = paymentInfo?.itemName || 'Article';
      
      // Create simple text receipt
      const receiptContent = currentLang === 'ht' ? `
====================================
         LAKOU MANMAN - RESI PÈMAN
====================================
Dat: ${new Date().toLocaleDateString()}
Fakti: LM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}

Atik: ${itemName}
Deskripsyon: Achat nan boutik Lakou Manman
Pri: $${parseFloat(amount || 0).toFixed(2)}

Mètòd pèman: Stripe
Stati: Peye ak siksè
====================================
Lakou Manman S.A.
Pòtoprens, Ayiti
contact@lakoumanman.com
+509 32589391
Mèsi pou konfyans ou !
====================================
      ` : `
====================================
         LAKOU MANMAN - REÇU DE PAIEMENT
====================================
Date: ${new Date().toLocaleDateString()}
Facture: LM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}

Article: ${itemName}
Description: Achat dans la boutique Lakou Manman
Prix: $${parseFloat(amount || 0).toFixed(2)}

Méthode de paiement: Stripe
Statut: Payé avec succès
====================================
Lakou Manman S.A.
Port-au-Prince, Haïti
contact@lakoumanman.com
+509 32589391
Merci pour votre confiance !
====================================
      `;

      // Download as text file
      const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lakou-manman-receipt-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setReceiptDialog({
        open: true,
        tone: "success",
        title: currentLang === 'ht' ? 'Resi pare' : 'Reçu prêt',
        message: currentLang === 'ht' ? 'Resi a telechaje!' : 'Reçu téléchargé!',
      });
    } catch (error) {
      console.error('Error generating receipt:', error);
      setReceiptDialog({
        open: true,
        tone: "error",
        title: 'Erreur reçu',
        message: 'Erreur lors du téléchargement du reçu.',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9B2335] mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="rounded-[2rem] border-0 shadow-lg">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-800">
              {t("paymentSuccessful")}
            </CardTitle>
            <p className="text-slate-600 mt-2">
              {t("thankYouForPurchase")}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {paymentInfo && (
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold mb-2">{t("orderSummary")}</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>{t("article")}:</span>
                    <span className="font-medium">{paymentInfo.itemName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("amount")}:</span>
                    <span className="font-bold text-[#9B2335]">${parseFloat(paymentInfo.amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={generateReceipt}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#9B2335] to-[#7B1A2C]"
              >
                <Download className="h-4 w-4 mr-2" />
                {t("downloadReceipt")}
              </Button>
              
              <Link href="/boutique" className="flex-1">
                <Button variant="outline" className="w-full rounded-xl">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  {t("backToShop")}
                </Button>
              </Link>
            </div>
            
            <div className="block">
              <Button variant="ghost" className="w-full rounded-xl" onClick={handleBack}>
                <Home className="h-4 w-4 mr-2" />
                {t("back")}
              </Button>
            </div>

            <ActionDialog
              open={receiptDialog.open}
              tone={receiptDialog.tone}
              title={receiptDialog.title}
              message={receiptDialog.message}
              closeLabel={t("close")}
              onClose={() => setReceiptDialog((prev) => ({ ...prev, open: false }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

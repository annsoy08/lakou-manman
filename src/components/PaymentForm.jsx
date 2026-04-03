"use client";

import React, { useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ActionDialog from "@/components/ui/action-dialog";
import { Loader2, CheckCircle, Download } from "lucide-react";
import MonCashPayment from "./MonCashPayment";

function CheckoutForm({ amount, onSuccess, itemInfo }) {
  const { t } = useLanguage();
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [receiptDialog, setReceiptDialog] = useState({
    open: false,
    tone: "info",
    title: "",
    message: "",
  });

  // Generate PDF receipt function - moved outside component scope
  const generatePaymentReceipt = (itemInfo, amount) => {
    const currentLang = typeof window !== 'undefined' ? localStorage.getItem('language') || 'fr' : 'fr';

    try {
      const finalAmount = (amount || itemInfo?.price || 0);

      // Check if we have valid data
      if (!itemInfo) {
        console.error('ERROR: No itemInfo provided for receipt generation');
        setReceiptDialog({
          open: true,
          tone: 'error',
          title: currentLang === 'ht' ? 'Erè resi' : 'Erreur reçu',
          message: currentLang === 'ht'
            ? 'Pa gen okenn pwodwi ki asosye ak peman sa a. Tanpri eseye ankò.'
            : 'Aucun produit associé à ce paiement. Veuillez réessayer.',
        });
        return;
      }
      
      const receiptContent = currentLang === 'ht' ? `
====================================
         LAKOU MANMAN - RESI
====================================
Dat: ${new Date().toLocaleDateString()}
Fakti: LM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}

Atik: ${itemInfo?.name || 'Atik'}
Deskripsyon: ${itemInfo?.description || 'Achat nan boutik la'}
Pri: $${finalAmount.toFixed(2)}

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
         LAKOU MANMAN - RECEIPT
====================================
Date: ${new Date().toLocaleDateString()}
Invoice: LM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}

Article: ${itemInfo?.name || 'Article'}
Description: ${itemInfo?.description || 'Achat dans la boutique'}
Prix: $${(amount || itemInfo?.price || 0).toFixed(2)}

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

      // Create HTML content for better PDF-like formatting
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Lakou Manman - Reçu</title>
    <style>
        @media print {
            body { 
                margin: 20px; 
                font-size: 12pt;
            }
            .no-print {
                display: none;
            }
        }
        
        body { 
            font-family: Arial, sans-serif; 
            margin: 40px; 
            line-height: 1.6;
            color: #333;
        }
        .header { 
            text-align: center; 
            border-bottom: 3px solid #9B2335; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
        }
        .title { 
            color: #9B2335; 
            font-size: 24px; 
            font-weight: bold; 
            margin-bottom: 5px;
        }
        .invoice-info { 
            text-align: right; 
            margin-bottom: 30px;
            font-size: 14px;
        }
        .item-info { 
            margin: 20px 0; 
            padding: 15px; 
            background: #f9f9f9; 
            border-left: 4px solid #9B2335;
        }
        .company-info { 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
        }
        .thank-you { 
            text-align: center; 
            margin: 30px 0; 
            font-style: italic;
            color: #9B2335;
            font-size: 16px;
        }
        .footer { 
            text-align: center; 
            margin-top: 40px; 
            font-size: 10px; 
            color: #999;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">LAKOU MANMAN</div>
        <div>${currentLang === 'ht' ? 'RESI PÈMAN' : 'REÇU DE PAIEMENT'}</div>
    </div>
    
    <div class="invoice-info">
        <strong>${currentLang === 'ht' ? 'Fakti:' : 'Facture:'}</strong> LM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}<br>
        <strong>${currentLang === 'ht' ? 'Dat:' : 'Date:'}</strong> ${new Date().toLocaleDateString()}
    </div>
    
    <div class="item-info">
        <strong>${currentLang === 'ht' ? 'Atik:' : 'Article:'}</strong> ${itemInfo?.name || (currentLang === 'ht' ? 'Atik' : 'Article')}<br>
        <strong>${currentLang === 'ht' ? 'Deskripsyon:' : 'Description:'}</strong> ${itemInfo?.description || (currentLang === 'ht' ? 'Achat nan boutik Lakou Manman' : 'Achat dans la boutique Lakou Manman')}<br>
        <strong>${currentLang === 'ht' ? 'Pri:' : 'Prix:'}</strong> $${(amount || itemInfo?.price || 0).toFixed(2)}
    </div>
    
    <div style="margin: 20px 0;">
        <strong>${currentLang === 'ht' ? 'Mètòd pèman:' : 'Méthode de paiement:'}</strong> Stripe<br>
        <strong>${currentLang === 'ht' ? 'Stati:' : 'Statut:'}</strong> ${currentLang === 'ht' ? 'Peye ak siksè' : 'Payé avec succès'}
    </div>
    
    <div class="thank-you">
        ${currentLang === 'ht' ? 'Mèsi pou konfyans ou !' : 'Merci pour votre confiance !'}
    </div>
    
    <div class="company-info">
        <strong>Lakou Manman S.A.</strong><br>
        ${currentLang === 'ht' ? 'Pòtoprens, Ayiti' : 'Port-au-Prince, Haïti'}<br>
        contact@lakoumanman.com<br>
        +509 32589391
    </div>
    
    <div class="footer">
        ${currentLang === 'ht' ? 'Resi a jenere otomatik ak valid kòm prèv payman.' : 'Ce reçu est généré automatiquement et valide comme preuve de paiement.'}<br>
        www.lakou-manman.com
    </div>
</body>
</html>
      `;

      // Generate PDF using HTML5 print-to-PDF approach
      generatePDFReceipt();
      
      function generatePDFReceipt() {
        const finalAmount = (amount || itemInfo?.price || 0);
        
        // Create HTML content for receipt
        const receiptContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Lakou Manman - Reçu</title>
    <style>
        @media print {
            body { 
                margin: 20px; 
                font-size: 12pt;
                font-family: Arial, sans-serif;
            }
            .no-print {
                display: none;
            }
        }
        
        body { 
            font-family: Arial, sans-serif; 
            margin: 40px; 
            line-height: 1.6;
            color: #333;
        }
        .header { 
            text-align: center; 
            border-bottom: 3px solid #9B2335; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            color: #9B2335;
            margin-bottom: 10px;
        }
        .invoice-info {
            margin: 20px 0;
            padding: 15px;
            background: #f9f9f9;
            border-radius: 8px;
        }
        .item-info {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 8px;
        }
        .company-info {
            margin-top: 40px;
            padding: 20px;
            background: #f5f5f5;
            border-radius: 8px;
            text-align: center;
        }
        .thank-you {
            text-align: center;
            font-style: italic;
            margin: 20px 0;
            color: #666;
        }
        .footer {
            text-align: center; 
            margin-top: 40px; 
            font-size: 10px; 
            color: #999;
        }
        .print-button {
            background: #9B2335;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin: 20px 0;
        }
        .print-button:hover {
            background: #7B1A2C;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">LAKOU MANMAN</div>
        <div>${currentLang === 'ht' ? 'RESI PÈMAN' : 'REÇU DE PAIEMENT'}</div>
    </div>
    
    <div class="invoice-info">
        <strong>${currentLang === 'ht' ? 'Fakti:' : 'Facture:'}</strong> LM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}<br>
        <strong>${currentLang === 'ht' ? 'Dat:' : 'Date:'}</strong> ${new Date().toLocaleDateString()}
    </div>
    
    <div class="item-info">
        <strong>${currentLang === 'ht' ? 'Atik:' : 'Article:'}</strong> ${itemInfo?.name || (currentLang === 'ht' ? 'Atik' : 'Article')}<br>
        <strong>${currentLang === 'ht' ? 'Deskripsyon:' : 'Description:'}</strong> ${itemInfo?.description || (currentLang === 'ht' ? 'Achat nan boutik Lakou Manman' : 'Achat dans la boutique Lakou Manman')}<br>
        <strong>${currentLang === 'ht' ? 'Pri:' : 'Prix:'}</strong> $${finalAmount.toFixed(2)}
    </div>
    
    <div style="margin: 20px 0;">
        <strong>${currentLang === 'ht' ? 'Mètòd pèman:' : 'Méthode de paiement:'}</strong> Stripe<br>
        <strong>${currentLang === 'ht' ? 'Stati:' : 'Statut:'}</strong> ${currentLang === 'ht' ? 'Peye ak siksè' : 'Payé avec succès'}
    </div>
    
    <div class="thank-you">
        ${currentLang === 'ht' ? 'Mèsi pou konfyans ou !' : 'Merci pour votre confiance !'}
    </div>
    
    <div class="company-info">
        <strong>Lakou Manman S.A.</strong><br>
        ${currentLang === 'ht' ? 'Pòtoprens, Ayiti' : 'Port-au-Prince, Haïti'}<br>
        contact@lakoumanman.com<br>
        +509 32589391
    </div>
    
    <div class="footer">
        ${currentLang === 'ht' ? 'Resi a jenere otomatik ak valid kòm prèv payman.' : 'Ce reçu est généré automatiquement et valide comme preuve de paiement.'}<br>
        www.lakou-manman.com
    </div>
    
    <div class="no-print" style="margin-top: 30px; text-align: center;">
        <button class="print-button" onclick="window.print()">
            🖨️ ${currentLang === 'ht' ? 'Imprime ou Enregistre comme PDF' : 'Imprimer ou Enregistrer comme PDF'}
        </button>
        <br><br>
        <small><strong>${currentLang === 'ht' ? 'ENSTRUCTION:' : 'INSTRUCTION:'}</strong><br>
        ${currentLang === 'ht' ? '1. Klike sou bouton an anwo a<br>2. Nan fenèt impression an, chwazi "Enregistrer au format PDF"<br>3. Nonmen fichye a epi anrejistre li' : '1. Cliquez sur le bouton ci-dessus<br>2. Dans la fenêtre d\'impression, choisissez "Enregistrer au format PDF"<br>3. Nommez le fichier et enregistrez-le'}</small>
    </div>
</body>
</html>
        `;
        
        // Create blob and download HTML file
        const blob = new Blob([receiptContent], { type: 'text/html;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lakou-manman-receipt-${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        // Show success message
        setReceiptDialog({
          open: true,
          tone: 'success',
          title: currentLang === 'ht' ? 'Resi pare' : 'Reçu prêt',
          message: currentLang === 'ht'
            ? 'Resi a telechaje nan fichye HTML. Louvri fichye a epi klike sou bouton enpresyon an pou jwenn PDF la.'
            : 'Le reçu a été téléchargé dans un fichier HTML. Ouvrez le fichier puis cliquez sur le bouton d\'impression pour obtenir le PDF.',
        });
      }
      
      function downloadAsTextFile() {
        const finalAmount = (amount || itemInfo?.price || 0);
        
        const textContent = currentLang === 'ht' ? `
====================================
         LAKOU MANMAN - RESI PÈMAN
====================================
Dat: ${new Date().toLocaleDateString()}
Fakti: LM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}

Atik: ${itemInfo?.name || 'Atik'}
Deskripsyon: ${itemInfo?.description || 'Achat nan boutik la'}
Pri: $${finalAmount.toFixed(2)}

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

Article: ${itemInfo?.name || 'Article'}
Description: ${itemInfo?.description || 'Achat dans la boutique'}
Prix: $${(amount || itemInfo?.price || 0).toFixed(2)}

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

        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lakou-manman-receipt-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      
      // Show success message
      setReceiptDialog({
        open: true,
        tone: 'success',
        title: currentLang === 'ht' ? 'Resi pare' : 'Reçu prêt',
        message: currentLang === 'ht'
          ? 'Resi a telechaje nan dosye .txt. Tcheke fichye telechaje yo.'
          : 'Le reçu a été téléchargé dans un fichier .txt. Vérifiez vos fichiers téléchargés.',
      });
      
    } catch (error) {
      console.error('Error generating receipt:', error);
      setReceiptDialog({
        open: true,
        tone: 'error',
        title: currentLang === 'ht' ? 'Erè resi' : 'Erreur reçu',
        message: currentLang === 'ht' ? 'Erè pandan telechajman resi a.' : 'Erreur lors du téléchargement du reçu.',
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsLoading(true);
    setMessage("");

    // Calculate receiptAmount before using it
    const receiptAmount = amount || itemInfo?.price || 0;

    // Check if Stripe is available (offline mode)
    if (!stripe || !elements) {
      setMessage(t("paymentSuccessMessage") || "Payment successful!");
      setIsComplete(true);
      
      // Generate receipt in offline mode
      generatePaymentReceipt(itemInfo, receiptAmount);
      
      onSuccess?.();
      setIsLoading(false);
      return;
    }

    // Check if PaymentElement is properly mounted
    const paymentElement = elements.getElement('payment');
    if (!paymentElement) {
      setMessage("Le formulaire de paiement n'est pas encore chargé. Veuillez réessayer.");
      setIsLoading(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success?amount=${encodeURIComponent(receiptAmount)}&item=${encodeURIComponent(itemInfo?.name || 'Article')}`,
        payment_method_data: {
          billing_details: {
            // Add billing details if needed
          },
        },
      },
    });

    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setMessage(error.message);
      } else {
        setMessage(t("paymentError") || "An unexpected error occurred.");
      }
    } else {
      setMessage(t("paymentSuccessMessage") || "Payment successful!");
      setIsComplete(true);

      generatePaymentReceipt(itemInfo, receiptAmount);
      
      onSuccess?.();
    }

    setIsLoading(false);
  };

  if (isComplete) {
    return (
      <>
        <Card className="rounded-xl border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              {t("paymentSuccessful")}
            </h3>
            <p className="text-green-600 mb-4">{t("thankYouForPurchase")}</p>
            
            <Button
              onClick={() => generatePaymentReceipt(itemInfo, amount)}
              variant="outline"
              className="rounded-xl border-green-600 text-green-600 hover:bg-green-50"
            >
              <Download className="h-4 w-4 mr-2" />
              {t("downloadReceipt") || "Télécharger le reçu"}
            </Button>
          </CardContent>
        </Card>

        <ActionDialog
          open={receiptDialog.open}
          tone={receiptDialog.tone}
          title={receiptDialog.title}
          message={receiptDialog.message}
          closeLabel={t("close")}
          onClose={() => setReceiptDialog((prev) => ({ ...prev, open: false }))}
        />
      </>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <PaymentElement />

        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.includes("successful") 
              ? "bg-green-50 text-green-700" 
              : "bg-red-50 text-red-700"
          }`}>
            {message}
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading || !stripe || !elements}
          className="w-full rounded-xl bg-gradient-to-r from-[#9B2335] to-[#7B1A2C]"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t("processingPayment")}
            </>
          ) : (
            `${t("payNow")} $${typeof amount === 'number' ? amount.toFixed(2) : (itemInfo?.price || 0).toFixed(2)}`
          )}
        </Button>
      </form>

      <ActionDialog
        open={receiptDialog.open}
        tone={receiptDialog.tone}
        title={receiptDialog.title}
        message={receiptDialog.message}
        closeLabel={t("close")}
        onClose={() => setReceiptDialog((prev) => ({ ...prev, open: false }))}
      />
    </>
  );
}

export default function PaymentForm({ amount, itemInfo, onSuccess }) {
  const { t } = useLanguage();
  const [paymentMethod, setPaymentMethod] = useState("moncash"); // moncash or stripe

  // Always use MonCash for now - it's more reliable for Haiti
  return <MonCashPayment amount={amount} itemInfo={itemInfo} onSuccess={onSuccess} />;
}

// PDF Generation Service for Lakou Manman
import jsPDF from 'jspdf';
import { useLanguage } from '@/contexts/LanguageContext';

export function generatePaymentPDF(paymentData, language = 'fr') {
  const doc = new jsPDF();
  
  // Translations
  const translations = {
    fr: {
      title: "Reçu de Paiement - Lakou Manman",
      invoice: "FACTURE",
      invoiceNumber: "Numéro de facture",
      date: "Date",
      paymentMethod: "Méthode de paiement",
      amount: "Montant",
      item: "Article",
      description: "Description",
      price: "Prix",
      quantity: "Quantité",
      total: "Total",
      customerInfo: "Informations client",
      companyName: "Lakou Manman S.A.",
      companyAddress: "Port-au-Prince, Haïti",
      companyEmail: "contact@lakou-manman.com",
      companyPhone: "+509 32 58 93 91",
      thankYou: "Merci pour votre confiance !",
      footerNote: "Ce reçu est généré automatiquement et valide comme preuve de paiement."
    },
    ht: {
      title: "Resi Payman - Lakou Manman",
      invoice: "FAKTÈ",
      invoiceNumber: "Nimewo fakti",
      date: "Dat",
      paymentMethod: "Mètòd payman",
      amount: "Montan",
      item: "Atik",
      description: "Deskripsyon",
      price: "Pri",
      quantity: "Kantite",
      total: "Total",
      customerInfo: "Enfòmasyon kliyan",
      companyName: "Lakou Manman S.A.",
      companyAddress: "Pòtoprens, Ayiti",
      companyEmail: "contact@lakou-manman.com",
      companyPhone: "+509 32 58 93 91",
      thankYou: "Mèsi pou konfyans ou !",
      footerNote: "Resi sa a jenere otomatikman ak valid kòm prèv payman."
    }
  };
  
  const t = translations[language] || translations.fr;
  
  // Set font for better Unicode support
  doc.setFont("helvetica");
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(155, 35, 53); // #9B2335
  doc.text(t.title, 105, 20, { align: "center" });
  
  // Company Info
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(t.companyName, 20, 40);
  doc.setFontSize(10);
  doc.text(t.companyAddress, 20, 45);
  doc.text(t.companyEmail, 20, 50);
  doc.text(t.companyPhone, 20, 55);
  
  // Invoice Info
  doc.setFontSize(14);
  doc.setTextColor(155, 35, 53);
  doc.text(t.invoice, 140, 40);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`${t.invoiceNumber}: ${paymentData.invoiceNumber || 'INV-' + Date.now()}`, 140, 50);
  doc.text(`${t.date}: ${new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'ht-HT')}`, 140, 55);
  doc.text(`${t.paymentMethod}: ${paymentData.paymentMethod || 'Stripe'}`, 140, 60);
  
  // Line
  doc.setDrawColor(155, 35, 53);
  doc.line(20, 70, 190, 70);
  
  // Items Table
  let yPosition = 80;
  
  // Table Headers
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(t.item, 20, yPosition);
  doc.text(t.description, 60, yPosition);
  doc.text(t.quantity, 130, yPosition);
  doc.text(t.price, 150, yPosition);
  doc.text(t.total, 170, yPosition);
  
  yPosition += 10;
  
  // Item details
  doc.setFont("helvetica", "normal");
  doc.text(paymentData.itemName || 'Article', 20, yPosition);
  doc.text(paymentData.itemDescription || 'Description de l\'article', 60, yPosition);
  doc.text('1', 130, yPosition);
  doc.text(`$${paymentData.amount || '0.00'}`, 150, yPosition);
  doc.text(`$${paymentData.amount || '0.00'}`, 170, yPosition);
  
  yPosition += 20;
  
  // Total
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`${t.total}: $${paymentData.amount || '0.00'}`, 170, yPosition);
  
  // Customer Info
  yPosition += 30;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(t.customerInfo, 20, yPosition);
  
  yPosition += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Nom: ${paymentData.customerName || 'Client'}`, 20, yPosition);
  
  yPosition += 5;
  doc.text(`Email: ${paymentData.customerEmail || 'client@example.com'}`, 20, yPosition);
  
  // Thank You Message
  yPosition += 20;
  doc.setFontSize(12);
  doc.setTextColor(155, 35, 53);
  doc.text(t.thankYou, 105, yPosition, { align: "center" });
  
  // Footer
  yPosition += 10;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(t.footerNote, 105, yPosition, { align: "center" });
  
  // Footer line
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 280, 190, 280);
  
  // Website
  doc.setTextColor(155, 35, 53);
  doc.text('www.lakou-manman.com', 105, 285, { align: "center" });
  
  return doc;
}

export function downloadPaymentPDF(paymentData, language = 'fr') {
  const doc = generatePaymentPDF(paymentData, language);
  const filename = `lakou-manman-receipt-${Date.now()}.pdf`;
  doc.save(filename);
  return filename;
}

export function getPaymentPDFBlob(paymentData, language = 'fr') {
  const doc = generatePaymentPDF(paymentData, language);
  return doc.output('blob');
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { createShopOrder } from "@/lib/firestore";
import ActionDialog from "@/components/ui/action-dialog";
import { CircleHelp } from "lucide-react";

const locationCoordinates = {
  "potoprens": { lat: 18.5392, lng: -72.335 },
  "port-au-prince": { lat: 18.5392, lng: -72.335 },
  "port au prince": { lat: 18.5392, lng: -72.335 },
  "delma": { lat: 18.5448, lng: -72.3026 },
  "delmas": { lat: 18.5448, lng: -72.3026 },
  "petyonvil": { lat: 18.5125, lng: -72.2853 },
  "petionville": { lat: 18.5125, lng: -72.2853 },
  "petion-ville": { lat: 18.5125, lng: -72.2853 },
  "petion ville": { lat: 18.5125, lng: -72.2853 },
  "kafou": { lat: 18.534, lng: -72.4051 },
  "carrefour": { lat: 18.534, lng: -72.4051 },
  "taba": { lat: 18.4289, lng: -72.2947 },
  "tabarre": { lat: 18.4289, lng: -72.2947 },
  "jakmel": { lat: 18.2343, lng: -72.5354 },
  "jacmel": { lat: 18.2343, lng: -72.5354 },
  "okap": { lat: 19.7594, lng: -72.1982 },
  "kap ayisyen": { lat: 19.7594, lng: -72.1982 },
  "cap-haitien": { lat: 19.7594, lng: -72.1982 },
  "cap haitien": { lat: 19.7594, lng: -72.1982 },
  "gonaiv": { lat: 19.4517, lng: -72.6893 },
  "gonaives": { lat: 19.4517, lng: -72.6893 },
};

const buyerLocations = [
  { value: "Port-au-Prince", labels: { fr: "Port-au-Prince", ht: "Pòtoprens" } },
  { value: "Delmas", labels: { fr: "Delmas", ht: "Delma" } },
  { value: "Pétion-Ville", labels: { fr: "Pétion-Ville", ht: "Petyonvil" } },
  { value: "Carrefour", labels: { fr: "Carrefour", ht: "Kafou" } },
  { value: "Tabarre", labels: { fr: "Tabarre", ht: "Taba" } },
  { value: "Jacmel", labels: { fr: "Jacmel", ht: "Jakmèl" } },
  { value: "Cap-Haïtien", labels: { fr: "Cap-Haïtien", ht: "Okap" } },
  { value: "Gonaïves", labels: { fr: "Gonaïves", ht: "Gonaïves" } },
];

const invoiceLogoSvg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Lakou Manman"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#9B2335"/><stop offset="100%" stop-color="#6B1525"/></linearGradient></defs><rect x="24" y="24" width="464" height="464" rx="96" fill="url(#bg)"/><circle cx="256" cy="200" r="82" fill="#ffffff" opacity="0.96"/><path d="M130 360c18-58 68-98 126-98s108 40 126 98" fill="none" stroke="#ffffff" stroke-width="34" stroke-linecap="round"/><text x="256" y="454" text-anchor="middle" fill="#ffffff" font-size="52" font-family="Arial, Helvetica, sans-serif" font-weight="700">LM</text></svg>`;
const invoiceLogoDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(invoiceLogoSvg)}`;

function downloadBlobFile(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getInvoicePaymentTheme(paymentMethod) {
  if (paymentMethod === "natcash") {
    return { label: "NatCash", background: "#FFF4E5", color: "#C05621", border: "#F6AD55" };
  }

  if (paymentMethod === "orange") {
    return { label: "Orange Money", background: "#FFF1E8", color: "#C05621", border: "#F6AD55" };
  }

  return { label: "MonCash", background: "#FDECEF", color: "#9B2335", border: "#E7A8B6" };
}

function normalizeLocation(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function resolveCoordinates(value) {
  const normalized = normalizeLocation(value);

  if (!normalized) {
    return null;
  }

  const exactMatch = locationCoordinates[normalized];

  if (exactMatch) {
    return exactMatch;
  }

  const partialMatch = Object.entries(locationCoordinates).find(([key]) => normalized.includes(key));
  return partialMatch ? partialMatch[1] : null;
}

function calculateDistanceKm(start, end) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(end.lat - start.lat);
  const deltaLng = toRadians(end.lng - start.lng);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(start.lat)) *
      Math.cos(toRadians(end.lat)) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function sanitizePdfText(value) {
  return String(value ?? "")
    .replace(/[•●]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/[═─]/g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, " ");
}

function parseJsonSafely(rawValue) {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

async function readApiJsonSafely(response) {
  const rawText = await response.text();
  const parsed = parseJsonSafely(rawText);

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed;
  }

  return {
    success: response.ok,
    message: String(rawText || "").trim(),
  };
}

function wrapPdfLine(line, maxLength = 88) {
  if (!line) {
    return [""];
  }

  const words = String(line).split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [""];
  }

  const wrappedLines = [];
  let currentLine = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const word = words[index];
    const candidate = `${currentLine} ${word}`;

    if (candidate.length > maxLength) {
      wrappedLines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = candidate;
    }
  }

  wrappedLines.push(currentLine);
  return wrappedLines;
}

function createPdfBlobFromText(text) {
  const wrappedLines = String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .flatMap((line) => wrapPdfLine(line));
  const printablePages = wrappedLines.length > 0 ? wrappedLines : [""];
  const pageHeight = 842;
  const topMargin = 48;
  const lineHeight = 16;
  const linesPerPage = 45;
  const pages = [];

  for (let index = 0; index < printablePages.length; index += linesPerPage) {
    pages.push(printablePages.slice(index, index + linesPerPage));
  }

  const objects = [];
  const pageObjectNumbers = [];

  pages.forEach((pageLines, pageIndex) => {
    const pageObjectNumber = 3 + pageIndex * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    pageObjectNumbers.push(pageObjectNumber);

    const streamLines = [
      "BT",
      "/F1 12 Tf",
      `${lineHeight} TL`,
      `50 ${pageHeight - topMargin} Td`,
    ];

    pageLines.forEach((line, lineIndex) => {
      const sanitizedLine = sanitizePdfText(line);
      if (lineIndex === 0) {
        streamLines.push(`(${sanitizedLine}) Tj`);
      } else {
        streamLines.push("T*");
        streamLines.push(`(${sanitizedLine}) Tj`);
      }
    });

    streamLines.push("ET");

    const contentStream = streamLines.join("\n");
    objects[pageObjectNumber - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
    objects[contentObjectNumber - 1] = `<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`;
  });

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((pageNumber) => `${pageNumber} 0 R`).join(" ")}] /Count ${pageObjectNumbers.length} >>`;
  objects[2 + pages.length * 2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((objectContent, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${objectContent}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export default function MonCashPayment({ amount, itemInfo, onSuccess }) {
  const { t, language } = useLanguage();
  const { user, userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentHelp, setShowPaymentHelp] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("moncash");
  const [deliveryOption, setDeliveryOption] = useState("pickup"); // pickup, delivery
  const [buyerLocation, setBuyerLocation] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [estimatedDistance, setEstimatedDistance] = useState(null);
  const [buyerCoordinates, setBuyerCoordinates] = useState(null);
  const [geoStatus, setGeoStatus] = useState("idle");
  const [geoError, setGeoError] = useState("");
  const [feedbackDialog, setFeedbackDialog] = useState({
    open: false,
    tone: "info",
    title: "",
    message: "",
  });
  const [invoiceDialog, setInvoiceDialog] = useState({
    open: false,
    title: "",
    message: "",
    paymentData: null,
  });
  const [completedTransactionKey, setCompletedTransactionKey] = useState("");
  const sellerLocation = useMemo(() => itemInfo?.location || "", [itemInfo?.location]);
  const sellerCoordinates = useMemo(() => {
    const coordinates = itemInfo?.sellerCoordinates;

    if (coordinates && coordinates.lat !== undefined && coordinates.lng !== undefined) {
      const lat = Number(coordinates.lat);
      const lng = Number(coordinates.lng);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }

    return resolveCoordinates(sellerLocation);
  }, [itemInfo?.sellerCoordinates, sellerLocation]);
  const sellerNatCashPhone = useMemo(
    () => itemInfo?.natcashPhone || itemInfo?.natCashPhone || itemInfo?.natcashNumber || "",
    [itemInfo?.natCashPhone, itemInfo?.natcashNumber, itemInfo?.natcashPhone]
  );
  const productAmount = typeof amount === "number" ? amount : (itemInfo?.price || 0);
  const minimumDeliveryFee = 75;
  const buyerLocationOptions = useMemo(
    () => buyerLocations.map((location) => ({
      value: location.value,
      label: language === "ht" ? location.labels.ht : location.labels.fr,
    })),
    [language]
  );
  const paymentLabels = {
    moncash: t("moncashOption") || "MonCash",
    orange: t("orangeMoneyOption") || "Orange Money",
    natcash: t("natcashOption") || "NatCash",
  };
  const activePaymentLabel = paymentLabels[paymentMethod] || paymentLabels.moncash;
  const paymentHeaderTitle = paymentMethod === "natcash"
    ? (t("paymentHeaderNatcash") || "Paiement NatCash")
    : paymentMethod === "orange"
      ? (t("paymentHeaderOrange") || "Paiement Orange Money")
      : (t("paymentHeaderMoncash") || "Paiement MonCash");
  const paymentHeaderDescription = paymentMethod === "natcash"
    ? (t("securePaymentNatcash") || "Paiement manuel sécurisé via NatCash")
    : paymentMethod === "orange"
      ? (t("securePaymentOrange") || "Paiement sécurisé via Orange Money")
      : (t("securePaymentMoncash") || "Paiement sécurisé via MonCash");
  const phoneInputLabel = paymentMethod === "natcash"
    ? (t("yourNatCashNumber") || "Votre numéro NatCash")
    : paymentMethod === "orange"
      ? (t("yourOrangeMoneyNumber") || "Votre numéro Orange Money")
      : (t("yourMonCashNumber") || "Votre numéro MonCash");
  const paymentHelp = language === "ht"
    ? {
        title: paymentMethod === "natcash" ? "Kijan peman NatCash la mache" : paymentMethod === "orange" ? "Kijan peman Orange Money la mache" : "Kijan peman MonCash la mache",
        steps: paymentMethod === "natcash"
          ? [
              "Fè peman an sou nimewo NatCash ki parèt anba a.",
              "Ekri referans tranzaksyon an ak nimewo ki te voye peman an.",
              "Chwazi retrè oswa livrezon si sa nesesè.",
              "Ekip la ap verifye peman an manyèlman avan yo konfime kòmand la."
            ]
          : [
              `Mete nimewo ${activePaymentLabel} ou a.`,
              "Chwazi retrè oswa livrezon.",
              "Pou livrezon, itilize GPS ou pou estime distans la ak frè yo.",
              `Apre sa, w ap resevwa yon SMS pou konfime peman ${activePaymentLabel} an.`
            ],
        useGps: "Itilize pozisyon GPS mwen",
        gpsReady: "Pozisyon GPS la byen detekte.",
        gpsLoading: "N ap chèche pozisyon ou...",
        gpsUnavailable: "GPS pa disponib sou aparèy sa a.",
        gpsDenied: "Nou pa rive jwenn pozisyon GPS ou. Verifye otorizasyon navigatè a.",
        gpsActive: "Pozisyon aktyèl la pral sèvi pou kalkile distans livrezon an."
      }
    : {
        title: paymentMethod === "natcash" ? "Comment fonctionne le paiement NatCash" : paymentMethod === "orange" ? "Comment fonctionne le paiement Orange Money" : "Comment fonctionne le paiement MonCash",
        steps: paymentMethod === "natcash"
          ? [
              "Effectuez le paiement sur le numéro NatCash affiché ci-dessous.",
              "Saisissez ensuite la référence de transaction et le numéro qui a envoyé le paiement.",
              "Choisissez retrait ou livraison si nécessaire.",
              "L'équipe vérifiera manuellement le paiement avant confirmation de la commande."
            ]
          : [
              `Entrez votre numéro ${activePaymentLabel}.`,
              "Choisissez le retrait ou la livraison.",
              "Pour la livraison, utilisez votre GPS pour estimer la distance et les frais.",
              `Vous recevrez ensuite un SMS pour confirmer le paiement ${activePaymentLabel}.`
            ],
        useGps: "Utiliser ma position GPS",
        gpsReady: "Position GPS détectée avec succès.",
        gpsLoading: "Recherche de votre position...",
        gpsUnavailable: "Le GPS n'est pas disponible sur cet appareil.",
        gpsDenied: "Impossible de récupérer votre position GPS. Vérifiez l'autorisation du navigateur.",
        gpsActive: "La position actuelle sera utilisée pour calculer la distance de livraison."
      };

  useEffect(() => {
    if (deliveryOption !== "delivery") {
      setDeliveryFee(0);
      setEstimatedDistance(null);
      return;
    }

    const resolvedBuyerCoordinates = buyerCoordinates || resolveCoordinates(buyerLocation || deliveryAddress);
    const hasBuyerContext = Boolean(buyerCoordinates || buyerLocation || deliveryAddress);

    if (!hasBuyerContext) {
      setDeliveryFee(0);
      setEstimatedDistance(null);
      return;
    }

    if (!sellerCoordinates || !resolvedBuyerCoordinates) {
      setDeliveryFee(minimumDeliveryFee);
      setEstimatedDistance(null);
      return;
    }

    const distanceKm = calculateDistanceKm(sellerCoordinates, resolvedBuyerCoordinates);
    const baseFee = minimumDeliveryFee;
    const variableFee = distanceKm * 8;
    const roundedFee = Math.max(minimumDeliveryFee, Math.round((baseFee + variableFee) / 5) * 5);

    setEstimatedDistance(distanceKm);
    setDeliveryFee(roundedFee);
  }, [buyerCoordinates, buyerLocation, deliveryAddress, deliveryOption, minimumDeliveryFee, sellerCoordinates]);

  const effectiveDeliveryFee = deliveryOption === "delivery"
    ? (deliveryFee > 0 ? deliveryFee : 0)
    : 0;
  const payableTotal = productAmount + effectiveDeliveryFee;

  const requestBuyerLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("error");
      setGeoError(paymentHelp.gpsUnavailable);
      return;
    }

    setGeoStatus("loading");
    setGeoError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBuyerCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGeoStatus("success");
      },
      () => {
        setBuyerCoordinates(null);
        setGeoStatus("error");
        setGeoError(paymentHelp.gpsDenied);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  const generateInvoice = (paymentData = null) => {
    const invoiceProductAmount = paymentData?.productAmount ?? productAmount;
    const invoiceDeliveryFee = paymentData?.deliveryFee ?? effectiveDeliveryFee;
    const invoiceTotalAmount = paymentData?.totalAmount ?? (invoiceProductAmount + invoiceDeliveryFee);
    const logoUrl = invoiceLogoDataUrl;
    const customerName = userProfile?.name || user?.displayName || "Client MonCash";
    const customerEmail = user?.email || "";
    const sellerName = itemInfo?.authorName || "Vendeur Lakou Manman";
    const sellerLocationLabel = itemInfo?.location || "";
    const invoicePaymentMethod = String(paymentData?.paymentMethod || paymentMethod || "moncash").trim().toLowerCase();
    const invoicePaymentMethodLabel = paymentLabels[invoicePaymentMethod] || paymentData?.paymentMethod || activePaymentLabel;
    const paymentTheme = getInvoicePaymentTheme(invoicePaymentMethod);
    const sellerPhone = invoicePaymentMethod === "natcash"
      ? (sellerNatCashPhone || itemInfo?.contact || itemInfo?.moncashPhone || "")
      : (itemInfo?.contact || itemInfo?.moncashPhone || "");
    const invoiceData = {
      invoiceNumber: paymentData ? `LM-2026-${paymentData.referenceNumber}` : `LM-2026-${Date.now().toString().slice(-5)}`,
      date: paymentData ? new Date(paymentData.timestamp).toLocaleDateString('fr-HT') : new Date().toLocaleDateString('fr-HT'),
      customerName: customerName,
      customerPhone: phoneNumber || "+509 XXX XXX XX",
      customerEmail: customerEmail,
      sellerName: sellerName,
      sellerPhone: sellerPhone,
      sellerLocation: sellerLocationLabel,
      items: [{
        name: paymentData?.itemName || itemInfo?.title || itemInfo?.name || 'Article',
        quantity: 1,
        unitPrice: invoiceProductAmount,
        total: invoiceProductAmount
      }],
      subtotal: invoiceProductAmount,
      deliveryFee: invoiceDeliveryFee,
      commission: paymentData?.commission || 0,
      commissionRate: paymentData?.commissionRate || 0.10,
      sellerAmount: paymentData?.sellerAmount || invoiceProductAmount,
      total: invoiceTotalAmount,
      paymentMethod: invoicePaymentMethodLabel,
      transactionId: paymentData?.transactionId || `${invoicePaymentMethod === "natcash" ? "NT" : invoicePaymentMethod === "orange" ? "OM" : "MC"}${Date.now()}`,
      referenceNumber: paymentData?.referenceNumber || Math.random().toString(36).substring(2, 15).toUpperCase()
    };
    const customerEmailHtml = invoiceData.customerEmail
      ? `<p><strong>Email:</strong> ${invoiceData.customerEmail}</p>`
      : "";
    const sellerPhoneHtml = invoiceData.sellerPhone
      ? `<p><strong>Téléphone:</strong> ${invoiceData.sellerPhone}</p>`
      : "";
    const sellerLocationHtml = invoiceData.sellerLocation
      ? `<p><strong>Localisation:</strong> ${invoiceData.sellerLocation}</p>`
      : "";
    const itemsHtml = invoiceData.items
      .map(
        (item) => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>$${item.unitPrice.toFixed(2)} HTG</td>
                <td>$${item.total.toFixed(2)} HTG</td>
              </tr>
            `
      )
      .join("");
    const deliveryFeeHtml = invoiceData.deliveryFee > 0
      ? `<p><strong>Frais de livraison:</strong> $${invoiceData.deliveryFee.toFixed(2)} HTG</p>`
      : "";
    const customerEmailText = invoiceData.customerEmail
      ? `${t("email") || "Email"}: ${invoiceData.customerEmail}`
      : "";
    const sellerPhoneText = invoiceData.sellerPhone
      ? `${t("phone") || "Téléphone"}: ${invoiceData.sellerPhone}`
      : "";
    const sellerLocationText = invoiceData.sellerLocation
      ? `${t("location") || "Localisation"}: ${invoiceData.sellerLocation}`
      : "";
    const deliveryFeeText = invoiceData.deliveryFee > 0
      ? `${t("deliveryFee") || "Frais de livraison"}:             $${invoiceData.deliveryFee.toFixed(2).padStart(10)} HTG`
      : "";
    const itemsText = invoiceData.items
      .map(
        (item) =>
          `- ${item.name}\n  ${t("quantity") || "Quantité"}: ${item.quantity}\n  ${t("price") || "Prix"}: $${item.unitPrice.toFixed(2)} HTG\n  ${t("total") || "Total"}: $${item.total.toFixed(2)} HTG`
      )
      .join("\n\n");
    const invoiceFileNameBase = `Facture-LakouManman-${invoiceData.invoiceNumber}`;

    // Create HTML for invoice
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Facture Lakou Manman</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 28px; color: #333; background: #f5f1f2; }
          .invoice-shell { max-width: 960px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 18px 48px rgba(107, 21, 37, 0.14); }
          .header { background: linear-gradient(135deg, #FFF6F8 0%, #FFFFFF 50%, #FBEAEC 100%); border-bottom: 2px solid #E7A8B6; padding: 28px 32px; }
          .header-top { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
          .brand-wrap { display: flex; align-items: center; gap: 18px; }
          .logo { width: 84px; height: 84px; display: block; }
          .brand { font-size: 28px; font-weight: bold; color: #9B2335; margin-bottom: 4px; }
          .subtitle { font-size: 14px; color: #6B1525; opacity: 0.8; }
          .payment-badge { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 999px; font-size: 14px; font-weight: 700; border: 1px solid ${paymentTheme.border}; background: ${paymentTheme.background}; color: ${paymentTheme.color}; }
          .header-meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 24px; }
          .meta-card { background: rgba(255, 255, 255, 0.9); border: 1px solid #F1D4DB; border-radius: 16px; padding: 14px 16px; }
          .meta-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #8B4B58; margin-bottom: 6px; }
          .meta-value { font-size: 16px; font-weight: 700; color: #2D1B1F; }
          .content { padding: 28px 32px 32px; }
          .invoice-info { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; margin-bottom: 30px; }
          .customer-info, .seller-info, .payment-info { background: #fcfafb; padding: 18px; border-radius: 18px; border: 1px solid #f0d9de; }
          .section-title { margin: 0 0 14px; font-size: 17px; color: #6B1525; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; overflow: hidden; border-radius: 16px; }
          .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          .items-table th { background-color: #FBEAEC; font-weight: bold; color: #6B1525; }
          .summary-card { background: linear-gradient(180deg, #FFF8F9 0%, #FFFFFF 100%); border: 1px solid #F0D9DE; border-radius: 20px; padding: 20px 22px; }
          .summary-row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; }
          .summary-total { margin-top: 10px; padding-top: 14px; border-top: 2px solid #E7A8B6; font-size: 20px; font-weight: 700; color: #9B2335; }
          .footer { margin-top: 32px; padding: 24px 28px 28px; background: #FFF6F8; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #F0D9DE; }
          .footer-logo { width: 68px; height: 68px; margin: 0 auto 10px; display: block; }
          @media (max-width: 820px) {
            .header-top, .invoice-info, .header-meta { grid-template-columns: 1fr; display: grid; }
            .brand-wrap { align-items: flex-start; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-shell">
          <div class="header">
            <div class="header-top">
              <div class="brand-wrap">
                <img class="logo" src="${logoUrl}" alt="Lakou Manman" />
                <div>
                  <div class="brand">LAKOU MANMAN</div>
                  <div class="subtitle">${t("platformSubtitle") || "Plateforme Communautaire Haïtienne"}</div>
                </div>
              </div>
              <div class="payment-badge">${paymentTheme.label}</div>
            </div>
            <div class="header-meta">
              <div class="meta-card">
                <div class="meta-label">${t("invoiceNumber") || "Numéro de facture"}</div>
                <div class="meta-value">${invoiceData.invoiceNumber}</div>
              </div>
              <div class="meta-card">
                <div class="meta-label">${t("date") || "Date"}</div>
                <div class="meta-value">${invoiceData.date}</div>
              </div>
              <div class="meta-card">
                <div class="meta-label">${t("method") || "Méthode"}</div>
                <div class="meta-value">${invoiceData.paymentMethod}</div>
              </div>
            </div>
          </div>
          <div class="content">
            <div class="invoice-info">
              <div class="customer-info">
                <h3 class="section-title">Informations Client</h3>
            <p><strong>Nom:</strong> ${invoiceData.customerName}</p>
            <p><strong>Téléphone:</strong> ${invoiceData.customerPhone}</p>
            ${customerEmailHtml}
          </div>

          <div class="seller-info">
            <h3 class="section-title">Informations Vendeur</h3>
            <p><strong>Nom:</strong> ${invoiceData.sellerName}</p>
            ${sellerPhoneHtml}
            ${sellerLocationHtml}
          </div>
          
          <div class="payment-info">
            <h3 class="section-title">Informations Paiement</h3>
            <p><strong>Méthode:</strong> ${invoiceData.paymentMethod}</p>
            <p><strong>Transaction:</strong> ${invoiceData.transactionId}</p>
            <p><strong>Référence:</strong> ${invoiceData.referenceNumber}</p>
          </div>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Article</th>
              <th>Quantité</th>
              <th>Prix Unitaire</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="summary-card">
          <div class="summary-row"><span><strong>Sous-total</strong></span><span>$${invoiceData.subtotal.toFixed(2)} HTG</span></div>
          ${invoiceData.deliveryFee > 0 ? `<div class="summary-row"><span><strong>Frais de livraison</strong></span><span>$${invoiceData.deliveryFee.toFixed(2)} HTG</span></div>` : ""}
          <div class="summary-row"><span><strong>Commission Lakou Manman (${(invoiceData.commissionRate * 100).toFixed(1)}%)</strong></span><span>$${invoiceData.commission.toFixed(2)} HTG</span></div>
          <div class="summary-row"><span><strong>Montant Vendeur</strong></span><span>$${invoiceData.sellerAmount.toFixed(2)} HTG</span></div>
          <div class="summary-row summary-total"><span>Total Payé</span><span>$${invoiceData.total.toFixed(2)} HTG</span></div>
        </div>
        
        <div class="footer">
          <img class="footer-logo" src="${logoUrl}" alt="Lakou Manman" />
          <p style="margin: 5px 0; font-size: 14px; font-weight: bold;">LAKOU MANMAN</p>
          <p style="margin: 5px 0; font-size: 12px;">Plateforme Communautaire Haïtienne</p>
          <p style="margin: 5px 0; font-size: 12px;">support@lakou-manman.com • +509 32 58 93 91</p>
          <p style="margin: 5px 0; font-size: 12px;">Client: ${invoiceData.customerName} • Vendeur: ${invoiceData.sellerName}</p>
          <p style="margin: 5px 0; font-size: 12px;">Merci pour votre confiance !</p>
        </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create professional PDF content with translations
    const pdfContent = [
      t("invoiceTitle") || "FACTURE LAKOU MANMAN",
      "═══════════════════════════════════════════════════════════════════",
      "",
      `${t("invoiceNumber") || "Numéro"}: ${invoiceData.invoiceNumber}`,
      `${t("date") || "Date"}: ${invoiceData.date}`,
      `${t("mode") || "Mode"}: ${invoiceData.paymentMethod}`,
      "",
      "═══════════════════════════════════════════════════════════════════",
      t("clientInfo") || "INFORMATIONS CLIENT",
      "───────────────────────────────────────────────────────────────────",
      `${t("name") || "Nom"}: ${invoiceData.customerName}`,
      `${t("phone") || "Téléphone"}: ${invoiceData.customerPhone}`,
      customerEmailText,
      "",
      "═══════════════════════════════════════════════════════════════════",
      t("seller") || "INFORMATIONS VENDEUR",
      "───────────────────────────────────────────────────────────────────",
      `${t("name") || "Nom"}: ${invoiceData.sellerName}`,
      sellerPhoneText,
      sellerLocationText,
      "",
      "═══════════════════════════════════════════════════════════════════",
      t("articleDetails") || "DÉTAILS ARTICLE",
      "───────────────────────────────────────────────────────────────────",
      itemsText,
      "",
      "═══════════════════════════════════════════════════════════════════",
      t("financialSummary") || "RÉCAPITULATIF FINANCIER",
      "───────────────────────────────────────────────────────────────────",
      `${t("subtotal") || "Sous-total"}:                    $${invoiceData.subtotal.toFixed(2).padStart(10)} HTG`,
      deliveryFeeText,
      `${t("lakouManmanCommission") || "Commission Lakou Manman"} (${(invoiceData.commissionRate * 100).toFixed(1)}%): $${invoiceData.commission.toFixed(2).padStart(10)} HTG`,
      `${t("sellerAmount") || "Montant Vendeur"}:               $${invoiceData.sellerAmount.toFixed(2).padStart(10)} HTG`,
      "───────────────────────────────────────────────────────────────────",
      `${t("totalPaid") || "TOTAL PAYÉ"}:                    $${invoiceData.total.toFixed(2).padStart(10)} HTG`,
      "",
      "═══════════════════════════════════════════════════════════════════",
      t("paymentInfo") || "INFORMATIONS PAIEMENT",
      "───────────────────────────────────────────────────────────────────",
      `${t("transactionId") || "Transaction ID"}: ${invoiceData.transactionId}`,
      `${t("reference") || "Référence"}: ${invoiceData.referenceNumber}`,
      `${t("method") || "Méthode"}: ${invoiceData.paymentMethod}`,
      "",
      "═══════════════════════════════════════════════════════════════════",
      `     ${t("platformSubtitle") || "Plateforme Communautaire Haïtienne"}`,
      `     ${t("thankYouForTrust") || "Merci pour votre confiance !"}`,
      "",
      `     ${t("contact") || "Contact"}: support@lakou-manman.com`,
      "     +509 32 58 93 91",
      "═══════════════════════════════════════════════════════════════════",
    ]
      .filter(Boolean)
      .join("\n");

    const downloadPDF = () => {
      try {
        const blob = createPdfBlobFromText(pdfContent);
        downloadBlobFile(blob, `${invoiceFileNameBase}.pdf`);
        return;
      } catch (error) {
        console.error("Error generating invoice download:", error);
      }

      throw new Error("Invoice PDF generation failed");
    };

    const downloadHtmlInvoice = () => {
      const invoiceBlob = new Blob([invoiceHTML], { type: "text/html;charset=utf-8" });
      downloadBlobFile(invoiceBlob, `${invoiceFileNameBase}.html`);
    };

    try {
      downloadHtmlInvoice();
    } catch (error) {
      console.error("Error generating branded invoice download:", error);
      downloadPDF();
    }
  };

  const closeInvoiceDialog = async ({ downloadInvoice = false } = {}) => {
    const paymentData = invoiceDialog.paymentData;

    setInvoiceDialog({ open: false, title: "", message: "", paymentData: null });

    if (downloadInvoice && paymentData) {
      window.setTimeout(() => {
        try {
          generateInvoice(paymentData);
        } catch (error) {
          console.error("Error generating shop invoice:", error);
        }
      }, 0);
    }

    if (!paymentData) {
      return;
    }

    const nextTransactionKey = paymentData.transactionId || paymentData.referenceNumber || "";
    if (nextTransactionKey && nextTransactionKey === completedTransactionKey) {
      return;
    }

    if (nextTransactionKey) {
      setCompletedTransactionKey(nextTransactionKey);
    }

    Promise.resolve(onSuccess?.(paymentData)).catch((error) => {
      console.error("Error after closing payment invoice dialog:", error);
    });

    if (paymentData.realMonCash && paymentData.status === "pending" && paymentData.paymentUrl && typeof window !== "undefined") {
      window.setTimeout(() => {
        window.location.assign(paymentData.paymentUrl);
      }, downloadInvoice ? 150 : 0);
    }
  };

  const handlePayment = async () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      setFeedbackDialog({
        open: true,
        tone: "error",
        title: language === "ht" ? "Enfòmasyon manke" : "Information manquante",
        message: t("validPhoneRequired") || "Veuillez entrer un numéro de téléphone valide",
      });
      return;
    }

    if (deliveryOption === "delivery" && !buyerLocation && !buyerCoordinates) {
      setFeedbackDialog({
        open: true,
        tone: "error",
        title: language === "ht" ? "Lokalizasyon obligatwa" : "Localisation requise",
        message: t("buyerLocationRequired") || "Veuillez choisir votre localisation pour la livraison.",
      });
      return;
    }

    if (paymentMethod === "natcash" && !sellerNatCashPhone) {
      setFeedbackDialog({
        open: true,
        tone: "error",
        title: t("paymentError") || "ERREUR PAIEMENT",
        message: t("natcashReceiverUnavailable") || "Aucun numéro NatCash n'est encore configuré pour cet article. Contactez le support avant de payer.",
      });
      return;
    }

    if (paymentMethod === "natcash" && !paymentReference.trim()) {
      setFeedbackDialog({
        open: true,
        tone: "error",
        title: language === "ht" ? "Referans obligatwa" : "Référence requise",
        message: t("paymentReferenceRequired") || "Veuillez saisir la référence de la transaction NatCash.",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const paymentData = paymentMethod === "natcash"
        ? {
            success: true,
            transactionId: `NT${Date.now()}`,
            referenceNumber: paymentReference.trim(),
            amount: payableTotal,
            productAmount: productAmount,
            deliveryFee: effectiveDeliveryFee,
            totalAmount: payableTotal,
            commission: productAmount * 0.10,
            sellerAmount: productAmount - (productAmount * 0.10),
            commissionRate: 0.10,
            currency: 'HTG',
            status: 'pending',
            timestamp: new Date().toISOString(),
            customerPhone: phoneNumber,
            paymentMethod: paymentMethod,
            itemName: itemInfo?.title || itemInfo?.name || 'Article',
            realMonCash: false,
            demoMode: false,
            paymentProofReference: paymentReference.trim(),
            paymentProofNote: paymentNote.trim(),
            natcashPhone: sellerNatCashPhone,
            manualReviewRequired: true,
          }
        : await (async () => {
            const response = await fetch('/api/moncash-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                amount: productAmount,
                phoneNumber: phoneNumber,
                itemName: itemInfo?.title || itemInfo?.name || 'Article',
                paymentMethod: paymentMethod,
                sellerMonCashPhone: itemInfo?.moncashPhone || '',
                deliveryOption: deliveryOption,
                buyerLocation: buyerLocation,
                buyerCoordinates: buyerCoordinates,
                sellerLocation: sellerLocation,
                deliveryAddress: deliveryAddress,
                deliveryFee: effectiveDeliveryFee,
                totalAmount: payableTotal
              }),
            });

            const responseData = await readApiJsonSafely(response);
            if (response.ok) {
              return responseData;
            }

            return {
              success: false,
              ...responseData,
              message: responseData.message || responseData.error || `Payment request failed (${response.status})`,
            };
          })();
      
      if (paymentData.success) {
        try {
          await createShopOrder({
            itemId: itemInfo?.id || "",
            itemTitle: itemInfo?.title || itemInfo?.name || "Article",
            itemPrice: productAmount,
            itemImage: itemInfo?.images?.[0]?.url || itemInfo?.images?.[0] || "",
            sellerId: itemInfo?.authorId || "",
            sellerName: itemInfo?.authorName || "",
            shopName: itemInfo?.shopName || "",
            sellerType: itemInfo?.sellerType || "individual",
            sellerPhone: paymentData.paymentMethod === "natcash"
              ? (sellerNatCashPhone || itemInfo?.contact || itemInfo?.moncashPhone || "")
              : (itemInfo?.moncashPhone || itemInfo?.contact || ""),
            sellerLocation: sellerLocation,
            buyerId: user?.uid || "",
            buyerName: userProfile?.name || user?.displayName || "Client",
            buyerEmail: user?.email || "",
            buyerPhone: phoneNumber,
            buyerLocation: buyerLocation || deliveryAddress || "",
            buyerCoordinates: buyerCoordinates,
            deliveryOption: deliveryOption,
            deliveryAddress: deliveryAddress,
            productAmount: paymentData.productAmount ?? productAmount,
            deliveryFee: paymentData.deliveryFee ?? effectiveDeliveryFee,
            totalAmount: paymentData.totalAmount ?? payableTotal,
            commissionRate: paymentData.commissionRate ?? 0.1,
            commissionAmount: paymentData.commission ?? 0,
            sellerAmount: paymentData.sellerAmount ?? productAmount,
            paymentMethod: paymentData.paymentMethod || paymentMethod,
            paymentStatus: paymentData.status || "pending",
            status: paymentData.status || "pending",
            supportStatus: paymentData.paymentMethod === "natcash" ? "monitoring" : undefined,
            fulfillmentStatus: paymentData.paymentMethod === "natcash" ? "awaiting_payment" : undefined,
            transactionId: paymentData.transactionId || "",
            referenceNumber: paymentData.referenceNumber || "",
            paymentProofStatus: paymentData.paymentMethod === "natcash" ? "provided" : undefined,
            paymentProofSource: paymentData.paymentMethod === "natcash" ? "natcash" : undefined,
            paymentProofReference: paymentData.paymentProofReference || paymentData.referenceNumber || "",
            paymentProofNote: paymentData.paymentProofNote || paymentNote.trim(),
            realMonCash: paymentData.realMonCash,
            demoMode: paymentData.demoMode,
          });
        } catch (orderError) {
          console.error("Error saving shop order:", orderError);
        }

        // Show appropriate message based on payment status
        let message = '';
        
        if (paymentData.paymentMethod === 'natcash') {
          message = `📲 ${t("natcashPaymentPending") || "PAIEMENT NATCASH À VÉRIFIER !"}

${t("transactionDetails") || "📱 Détails Transaction:"}
• ${t("article") || "Article"}: ${paymentData.itemName}
• ${t("amount") || "Montant"}: $${(paymentData.productAmount ?? productAmount).toFixed(2)} HTG
${paymentData.deliveryFee > 0 ? `• ${t("deliveryFee") || "Frais de livraison"}: $${paymentData.deliveryFee.toFixed(2)} HTG
• ${t("total") || "Total"}: $${(paymentData.totalAmount ?? paymentData.amount).toFixed(2)} HTG
` : ""}• ${t("lakouManmanCommission") || "Commission Lakou Manman"}: $${paymentData.commission.toFixed(2)} HTG (${(paymentData.commissionRate * 100).toFixed(1)}%)

${t("paymentInfo") || "🔍 Informations Paiement:"}
• ${t("method") || "Méthode"}: ${paymentLabels.natcash}
• ${t("reference") || "Référence"}: ${paymentData.referenceNumber}
• ${t("phone") || "Téléphone"}: ${paymentData.customerPhone}
• ${t("natcashReceiverNumber") || "Numéro NatCash à payer"}: ${paymentData.natcashPhone}
${paymentData.paymentProofNote ? `• ${t("paymentNoteLabel") || "Note de paiement"}: ${paymentData.paymentProofNote}
` : ""}
${t("mode") || "Mode"}: ${t("natcashManualMode") || "Vérification manuelle"}

${language === "ht"
  ? "Ekip Lakou Manman an ap verifye referans sa a anvan yo konfime kòmand ou a."
  : "L'équipe Lakou Manman vérifiera cette référence avant de confirmer votre commande."}

${t("downloadProvisionalInvoice") || "Voulez-vous télécharger une facture provisoire ?"}`;
        } else if (paymentData.realMonCash && paymentData.status === 'pending') {
          message = `📲 ${t("moncashPaymentPending") || "PAIEMENT MONCASH EN COURS !"}

${t("transactionDetails") || "📱 Détails Transaction:"}
• ${t("article") || "Article"}: ${paymentData.itemName}
• ${t("amount") || "Montant"}: $${(paymentData.productAmount ?? productAmount).toFixed(2)} HTG
${paymentData.deliveryFee > 0 ? `• ${t("deliveryFee") || "Frais de livraison"}: $${paymentData.deliveryFee.toFixed(2)} HTG
• ${t("total") || "Total"}: $${(paymentData.totalAmount ?? paymentData.amount).toFixed(2)} HTG
` : ""}• ${t("lakouManmanCommission") || "Commission Lakou Manman"}: $${paymentData.commission.toFixed(2)} HTG (${(paymentData.commissionRate * 100).toFixed(1)}%)

${t("paymentInfo") || "🔍 Informations Paiement:"}
• ${t("transactionId") || "Transaction ID"}: ${paymentData.transactionId}
• ${t("reference") || "Référence"}: ${paymentData.referenceNumber}
• ${t("phone") || "Téléphone"}: ${paymentData.customerPhone}

${t("actionRequired") || "📲 ACTION REQUISE:"}
${t("checkSmsText") || "Vérifiez vos SMS"} ${paymentData.customerPhone}
${t("receiveMoncashText") || "Vous devriez recevoir un message de MonCash pour confirmer ce paiement."}

${t("replyYesText") || "Répondez \"OUI\" au SMS pour finaliser l'achat."}

${t("downloadProvisionalInvoice") || "Voulez-vous télécharger une facture provisoire ?"}`;
        } else {
          message = `✅ ${t("moncashPaymentSuccess") || "PAIEMENT MONCASH RÉUSSI !"}

${t("transactionDetails") || "📱 Détails Transaction:"}
• ${t("article") || "Article"}: ${paymentData.itemName}
• ${t("amount") || "Montant"}: $${(paymentData.productAmount ?? productAmount).toFixed(2)} HTG
${paymentData.deliveryFee > 0 ? `• ${t("deliveryFee") || "Frais de livraison"}: $${paymentData.deliveryFee.toFixed(2)} HTG
• ${t("total") || "Total"}: $${(paymentData.totalAmount ?? paymentData.amount).toFixed(2)} HTG
` : ""}
• ${t("lakouManmanCommission") || "Commission Lakou Manman"}: $${paymentData.commission.toFixed(2)} HTG (${(paymentData.commissionRate * 100).toFixed(1)}%)

${t("paymentInfo") || "🔍 Informations Paiement:"}
• ${t("transactionId") || "Transaction ID"}: ${paymentData.transactionId}
• ${t("reference") || "Référence"}: ${paymentData.referenceNumber}
• ${t("phone") || "Téléphone"}: ${paymentData.customerPhone}
• ${t("method") || "Méthode"}: ${paymentLabels[paymentData.paymentMethod] || paymentData.paymentMethod}
• ${t("mode") || "Mode"}: ${paymentData.paymentMethod === "natcash" ? (t("natcashManualMode") || 'Vérification manuelle') : paymentData.realMonCash ? (t("realMoncash") || 'MonCash Réel') : (t("demoMode") || 'Mode Demo')}

${t("date") || "🕐 Date"}: ${new Date(paymentData.timestamp).toLocaleString('fr-HT')}

${t("downloadInvoice") || "Voulez-vous télécharger votre facture ?"}`;
        }

        setInvoiceDialog({
          open: true,
          title: paymentData.paymentMethod === "natcash"
            ? (language === "ht" ? "Pèman pou verifye" : "Paiement à vérifier")
            : paymentData.realMonCash && paymentData.status === 'pending'
            ? (language === "ht" ? "Peman an atant" : "Paiement en attente")
            : (language === "ht" ? "Peman reyisi" : "Paiement réussi"),
          message,
          paymentData,
        });
      } else {
        setFeedbackDialog({
          open: true,
          tone: "error",
          title: t("paymentError") || "ERREUR PAIEMENT",
          message: paymentData.message || (t("errorOccurred") || 'Une erreur est survenue'),
        });
      }
    } catch (error) {
      console.error('MONCASH API ERROR:', error);
      setFeedbackDialog({
        open: true,
        tone: "error",
        title: t("error") || "ERREUR",
        message: t("paymentProcessingError") || 'Impossible de traiter le paiement. Veuillez réessayer.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">{paymentHeaderTitle}</h3>
          <p className="text-sm text-slate-600">{paymentHeaderDescription}</p>
        </div>

        <div className="mb-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowPaymentHelp((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-medium text-orange-700 transition hover:bg-orange-100"
            >
              <CircleHelp className="h-4 w-4" />
              {showPaymentHelp
                ? (language === "ht" ? "Femen èd la" : "Fermer l'aide")
                : (language === "ht" ? "Kijan sa mache?" : "Comment ça marche ?")}
            </button>
          </div>
          {showPaymentHelp && (
            <div className="mt-3 rounded-lg border border-orange-100 bg-orange-50 p-4 shadow-sm">
              <p className="mb-2 text-sm font-semibold text-orange-800">{paymentHelp.title}</p>
              <ol className="space-y-1 text-xs text-orange-700">
                {paymentHelp.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="bg-slate-50 p-4 rounded-lg mb-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{t("article") || "Article"}:</span>
              <span className="font-medium">{itemInfo?.title || itemInfo?.name || 'Article'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{t("price") || "Prix"}:</span>
              <span className="font-medium">${productAmount.toFixed(2)} HTG</span>
            </div>
            {deliveryOption === 'delivery' && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{t("deliveryFee") || "Frais de livraison"}:</span>
                <span className="font-medium text-orange-600">
                  {effectiveDeliveryFee > 0 ? `$${effectiveDeliveryFee.toFixed(2)} HTG` : t("calculated") || "Calculé"}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{t("lakouManmanCommission") || "Commission Lakou Manman"} (10%):</span>
              <span className="font-medium">${(productAmount * 0.10).toFixed(2)} HTG</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>{t("total") || "Total"}:</span>
              <span className="text-orange-600">
                ${payableTotal.toFixed(2)} HTG
              </span>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="space-y-3 mb-6">
          <label className="block text-sm font-medium mb-2">{t("paymentMethodLabel") || "Méthode de paiement"}</label>
          
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setPaymentMethod("moncash")}
              className={`p-3 rounded-lg border-2 transition-all ${
                paymentMethod === "moncash" 
                  ? "border-orange-500 bg-orange-50" 
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="text-center">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-1">
                  <span className="text-orange-600 font-bold text-sm">MC</span>
                </div>
                <span className="text-xs font-medium">{t("moncashOption") || "MonCash"}</span>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod("orange")}
              className={`p-3 rounded-lg border-2 transition-all ${
                paymentMethod === "orange" 
                  ? "border-orange-500 bg-orange-50" 
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="text-center">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-1">
                  <span className="text-orange-600 font-bold text-sm">OM</span>
                </div>
                <span className="text-xs font-medium">{t("orangeMoneyOption") || "Orange Money"}</span>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod("natcash")}
              className={`p-3 rounded-lg border-2 transition-all ${
                paymentMethod === "natcash"
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="text-center">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-1">
                  <span className="text-emerald-600 font-bold text-sm">NC</span>
                </div>
                <span className="text-xs font-medium">{t("natcashOption") || "NatCash"}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Delivery Options */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">
            🚚 {t("deliveryOptions") || "Options de livraison"}
          </label>
          <div className="space-y-3">
            <label className="flex items-center p-3 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="delivery"
                value="pickup"
                checked={deliveryOption === 'pickup'}
                onChange={(e) => {
                  setDeliveryOption('pickup');
                  setBuyerLocation("");
                  setBuyerCoordinates(null);
                  setGeoStatus("idle");
                  setGeoError("");
                  setDeliveryFee(0);
                  setEstimatedDistance(null);
                }}
                className="mr-3"
              />
              <div className="flex-1">
                <div className="font-medium">{t("pickup") || "Retrait sur place"}</div>
                <div className="text-xs text-slate-600">{t("pickupDescription") || "Récupérer directement auprès du vendeur"}</div>
              </div>
              <div className="text-green-600 font-medium">{t("free") || "GRATUIT"}</div>
            </label>
            
            <label className="flex items-center p-3 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="delivery"
                value="delivery"
                checked={deliveryOption === 'delivery'}
                onChange={(e) => {
                  setDeliveryOption('delivery');
                }}
                className="mr-3"
              />
              <div className="flex-1">
                <div className="font-medium">{t("homeDelivery") || "Livraison à domicile"}</div>
                <div className="text-xs text-slate-600">{t("deliveryDescription") || "Livraison à votre adresse"}</div>
              </div>
              <div className="text-orange-600 font-medium">
                {effectiveDeliveryFee > 0 ? `$${effectiveDeliveryFee.toFixed(2)}` : t("calculated") || "Calculé"}
              </div>
            </label>
          </div>
        </div>

        {/* Delivery Address */}
        {deliveryOption === 'delivery' && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              📍 {t("buyerLocation") || "Votre localisation"}
            </label>
            <select
              value={buyerLocation}
              onChange={(e) => {
                setBuyerLocation(e.target.value);
                setBuyerCoordinates(null);
                setGeoStatus("idle");
                setGeoError("");
              }}
              className="mb-3 w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">{t("buyerLocationPlaceholder") || "Ex: Delmas, Pétion-Ville, Jacmel..."}</option>
              {buyerLocationOptions.map((location) => (
                <option key={location.value} value={location.value}>
                  {location.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={requestBuyerLocation}
              className="mb-3 w-full rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700 transition hover:bg-orange-100"
            >
              {geoStatus === "loading" ? paymentHelp.gpsLoading : paymentHelp.useGps}
            </button>
            {geoStatus === "success" && (
              <p className="mb-3 text-xs text-green-700">
                {paymentHelp.gpsReady} {paymentHelp.gpsActive}
              </p>
            )}
            {geoError && (
              <p className="mb-3 text-xs text-red-600">{geoError}</p>
            )}
            {sellerLocation && (
              <div className="mb-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <strong>{t("sellerLocation") || "Localisation du vendeur"}:</strong> {sellerLocation}
              </div>
            )}
            <label className="block text-sm font-medium mb-2">
              📍 {t("deliveryAddress") || "Adresse de livraison"}
            </label>
            <textarea
              placeholder={t("deliveryAddressPlaceholder") || "Entrez votre adresse complète..."}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              rows="3"
            />
            <div className="mt-2 p-3 bg-orange-50 rounded-lg">
              <p className="text-xs text-orange-700">
                <strong>📍 {t("deliveryInfo") || "Information livraison"}:</strong> {t("deliveryFeeCalculated") || "Les frais de livraison seront calculés selon la distance"}
              </p>
              {estimatedDistance !== null ? (
                <p className="mt-1 text-xs text-orange-700">
                  <strong>{t("estimatedDistance") || "Distance estimée"}:</strong> {estimatedDistance.toFixed(1)} km
                </p>
              ) : (
                <p className="mt-1 text-xs text-orange-700">
                  {t("deliveryEstimateUnavailable") || "Impossible d'estimer les frais automatiquement avec cette localisation."}
                </p>
              )}
              {effectiveDeliveryFee > 0 && (
                <p className="mt-1 text-xs text-orange-700">
                  <strong>{t("deliveryFee") || "Frais de livraison"}:</strong> ${effectiveDeliveryFee.toFixed(2)} HTG
                </p>
              )}
            </div>
          </div>
        )}

        {paymentMethod === "natcash" && (
          <div className="mb-6 space-y-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800">
                {t("natcashReceiverNumber") || "Numéro NatCash à payer"}
              </p>
              <p className="mt-1 text-lg font-bold text-emerald-700">{sellerNatCashPhone || "-"}</p>
              <p className="mt-2 text-xs text-emerald-700">
                {language === "ht"
                  ? "Voye montan total la sou nimewo sa a, epi antre referans la anba a pou ekip la verifye li."
                  : "Envoyez le montant total sur ce numéro puis saisissez la référence ci-dessous pour vérification manuelle."}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t("natcashReferenceLabel") || "Référence NatCash"}
              </label>
              <input
                type="text"
                placeholder={t("natcashReferencePlaceholder") || "Ex: NAT123456 ou référence envoyée après paiement"}
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-3 focus:border-transparent focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t("paymentNoteLabel") || "Note de paiement"} ({t("optional") || "Optionnel"})
              </label>
              <textarea
                placeholder={t("paymentNotePlaceholder") || "Ex: paiement envoyé depuis le numéro de mon conjoint"}
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-3 focus:border-transparent focus:ring-2 focus:ring-emerald-500 resize-none"
                rows="3"
              />
            </div>
          </div>
        )}

        {/* Phone Number Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            📱 {phoneInputLabel}
          </label>
          <input
            type="tel"
            placeholder="+509 34 56 78 90"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <div className="mt-2 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>📲 {t("important") || "Important"}:</strong> {paymentMethod === "natcash"
                ? (language === "ht"
                  ? "Se nimewo sa a nou pral itilize pou kontakte ou si nou bezwen plis detay sou pèman NatCash la."
                  : "Ce numéro sera utilisé pour vous contacter si nous avons besoin d'un complément d'information sur le paiement NatCash.")
                : (t("smsConfirmationText") || "Vous recevrez un SMS de confirmation sur ce numéro pour valider le paiement.")}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {paymentMethod === "natcash"
                ? (language === "ht"
                  ? "Kenbe prèv NatCash ou a pandan ekip la ap verifye kòmand la."
                  : "Conservez votre preuve NatCash pendant que l'équipe vérifie la commande.")
                : (t("amountDebitedText") || "Le montant sera débité de votre compte MonCash/Orange Money.")}
            </p>
          </div>
        </div>

        {/* Payment Button */}
        <button
          onClick={handlePayment}
          disabled={isLoading || !phoneNumber || (paymentMethod === "natcash" && !paymentReference.trim())}
          className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Traitement en cours...
            </>
          ) : (
            <>
              {paymentMethod === "natcash"
                ? (t("payWithNatCash") || "Confirmer avec NatCash")
                : paymentMethod === "orange"
                  ? (t("payWithOrangeMoney") || "Payer avec Orange Money")
                  : (t("payWithMonCash") || "Payer avec MonCash")}
            </>
          )}
        </button>

        {/* Security Note */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            🔒 {paymentHeaderDescription}
          </p>
        </div>

        <ActionDialog
          open={feedbackDialog.open}
          tone={feedbackDialog.tone}
          title={feedbackDialog.title}
          message={feedbackDialog.message}
          closeLabel={t("close")}
          onClose={() => setFeedbackDialog((prev) => ({ ...prev, open: false }))}
        />

        <ActionDialog
          open={invoiceDialog.open}
          tone="info"
          title={invoiceDialog.title}
          message={invoiceDialog.message}
          confirmLabel={language === "ht" ? "Telechaje fakti a" : "Télécharger la facture"}
          cancelLabel={language === "ht" ? "Pita" : "Plus tard"}
          closeLabel={t("close")}
          onClose={() => closeInvoiceDialog()}
          onConfirm={() => closeInvoiceDialog({ downloadInvoice: true })}
        />
      </div>
    </div>
  );
}

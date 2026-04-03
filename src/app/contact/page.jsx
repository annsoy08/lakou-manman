"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Send } from "lucide-react";

export default function ContactPage() {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");

  const content = language === "ht"
    ? {
        title: "Kontakte nou",
        description: "Kontakte nou pou nenpòt kestyon, sijesyon oswa bezwen sipò.",
        formTitle: "Voye yon mesaj",
        subjectLabel: "Sijè",
        subjectPlaceholder: "Sijè mesaj la",
        messagePlaceholder: "Ekri mesaj ou la...",
        sendLabel: "Voye",
        contactDetailsTitle: "Enfòmasyon kontak",
        emailLabel: "Imèl",
        addressLabel: "Adrès",
        officeHoursTitle: "Lè biwo yo ouvè",
        officeHours: [
          "Lendi - Vandredi: 9:00 - 17:00",
          "Samdi: 9:00 - 13:00",
          "Dimanch: Fèmen"
        ],
        quickLinksTitle: "Lyen itil",
        quickLinks: [
          { label: "Sant èd", href: "/help" },
          { label: "A pwopo", href: "/about" },
          { label: "Politik konfidansyalite", href: "/privacy" }
        ],
        directContactTitle: "Kontak dirèk",
        directContactDescription: "Ou ka itilize lyen sa yo pou voye imèl, rele oswa jwenn adrès la pi vit.",
        missingFields: "Tanpri ranpli non ou, imèl ou, sijè a ak mesaj la.",
        invalidEmail: "Tanpri antre yon imèl ki valab.",
        sendingLabel: "Voye an pwogrè...",
        successMessage: "Mesaj ou a voye avèk siksè. N ap reponn ou byento.",
        genericError: "Nou pa t ka voye mesaj la kounye a. Tanpri eseye ankò pita.",
        configurationError: "Sèvis mesaj la poko konfigire sou sèvè a."
      }
    : {
        title: "Nous contacter",
        description: "Contactez-nous pour toute question, suggestion ou besoin d'assistance.",
        formTitle: "Envoyer un message",
        subjectLabel: "Sujet",
        subjectPlaceholder: "Sujet du message",
        messagePlaceholder: "Écrivez votre message ici...",
        sendLabel: "Envoyer",
        contactDetailsTitle: "Informations de contact",
        emailLabel: "Email",
        addressLabel: "Adresse",
        officeHoursTitle: "Heures d'ouverture",
        officeHours: [
          "Lundi - Vendredi: 9:00 - 17:00",
          "Samedi: 9:00 - 13:00",
          "Dimanche: Fermé"
        ],
        quickLinksTitle: "Liens utiles",
        quickLinks: [
          { label: "Centre d'aide", href: "/help" },
          { label: "À propos", href: "/about" },
          { label: "Politique de confidentialité", href: "/privacy" }
        ],
        directContactTitle: "Contact direct",
        directContactDescription: "Vous pouvez utiliser ces liens pour envoyer un email, appeler ou ouvrir l'adresse plus rapidement.",
        missingFields: "Veuillez renseigner votre nom, votre email, le sujet et le message.",
        invalidEmail: "Veuillez entrer une adresse email valide.",
        sendingLabel: "Envoi en cours...",
        successMessage: "Votre message a bien été envoyé. Nous vous répondrons rapidement.",
        genericError: "Nous n'avons pas pu envoyer votre message pour le moment. Merci de réessayer plus tard.",
        configurationError: "Le service de contact n'est pas encore configuré sur le serveur."
      };

  function isValidEmail(emailValue) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  }

  function handleFieldChange(fieldName, fieldValue) {
    setFormData((currentFormData) => ({
      ...currentFormData,
      [fieldName]: fieldValue,
    }));

    if (submitError) {
      setSubmitError("");
    }

    if (submitMessage) {
      setSubmitMessage("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedFormData = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      subject: formData.subject.trim(),
      message: formData.message.trim(),
    };

    if (!trimmedFormData.name || !trimmedFormData.email || !trimmedFormData.subject || !trimmedFormData.message) {
      setSubmitMessage("");
      setSubmitError(content.missingFields);
      return;
    }

    if (!isValidEmail(trimmedFormData.email)) {
      setSubmitMessage("");
      setSubmitError(content.invalidEmail);
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setSubmitMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(trimmedFormData),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (result?.error === "service_unconfigured") {
          setSubmitError(content.configurationError);
        } else if (result?.error === "validation_error") {
          setSubmitError(result?.message || content.missingFields);
        } else if (result?.error === "send_failed") {
          setSubmitError(result?.message || content.genericError);
        } else {
          setSubmitError(content.genericError);
        }
        return;
      }

      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
      setSubmitMessage(content.successMessage);
    } catch {
      setSubmitError(content.genericError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            {content.title}
          </h1>
          <p className="text-slate-600">
            {content.description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                {content.formTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t("yourName") || "Votre nom"}
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(event) => handleFieldChange("name", event.target.value)}
                    placeholder={t("namePlaceholder") || "Entrez votre nom"}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t("yourEmail") || "Votre email"}
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(event) => handleFieldChange("email", event.target.value)}
                    placeholder={t("emailPlaceholder") || "votre@email.com"}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {content.subjectLabel}
                  </label>
                  <Input
                    value={formData.subject}
                    onChange={(event) => handleFieldChange("subject", event.target.value)}
                    placeholder={content.subjectPlaceholder}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t("message") || "Message"}
                  </label>
                  <Textarea
                    value={formData.message}
                    onChange={(event) => handleFieldChange("message", event.target.value)}
                    placeholder={content.messagePlaceholder}
                    rows={4}
                    required
                  />
                </div>
                {submitError ? (
                  <p className="text-sm text-red-600">{submitError}</p>
                ) : null}
                {submitMessage ? (
                  <p className="text-sm text-slate-600">{submitMessage}</p>
                ) : null}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? content.sendingLabel : content.sendLabel}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{content.contactDetailsTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <a href="mailto:contact@lakoumanman.com" className="flex items-center gap-3 rounded-xl transition hover:bg-slate-50 p-2 -m-2">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                  <Mail className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <div className="font-medium">{content.emailLabel}</div>
                  <div className="text-slate-600">contact@lakoumanman.com</div>
                </div>
              </a>

              <a href="tel:+50932589391" className="flex items-center gap-3 rounded-xl transition hover:bg-slate-50 p-2 -m-2">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Phone className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium">{t("phone") || "Téléphone"}</div>
                  <div className="text-slate-600">+509 32 58 93 91</div>
                </div>
              </a>

              <a href="https://www.google.com/maps/search/?api=1&query=Hinche%2C+Ha%C3%AFti" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl transition hover:bg-slate-50 p-2 -m-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">{content.addressLabel}</div>
                  <div className="text-slate-600">Petion-ville, Haïti</div>
                </div>
              </a>

              <div className="rounded-2xl bg-slate-50 p-4">
                <h4 className="font-medium mb-2">{content.directContactTitle}</h4>
                <p className="text-sm text-slate-600">{content.directContactDescription}</p>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <h4 className="font-medium mb-3">{content.officeHoursTitle}</h4>
                <div className="space-y-1 text-sm text-slate-600">
                  {content.officeHours.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <h4 className="font-medium mb-3">{content.quickLinksTitle}</h4>
                <div className="flex flex-wrap gap-2">
                  {content.quickLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-pink-200 hover:text-pink-600">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

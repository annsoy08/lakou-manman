"use client";

import { AlertCircle, CheckCircle2, MessageCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const toneConfig = {
  success: {
    barClassName: "bg-emerald-500",
    iconWrapClassName: "bg-emerald-50 text-emerald-600",
    Icon: CheckCircle2,
    confirmClassName: "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:opacity-95",
  },
  info: {
    barClassName: "bg-amber-400",
    iconWrapClassName: "bg-amber-50 text-amber-600",
    Icon: MessageCircle,
    confirmClassName: "bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] text-white hover:opacity-95",
  },
  danger: {
    barClassName: "bg-rose-500",
    iconWrapClassName: "bg-rose-50 text-rose-600",
    Icon: ShieldAlert,
    confirmClassName: "bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:opacity-95",
  },
  error: {
    barClassName: "bg-red-500",
    iconWrapClassName: "bg-red-50 text-red-600",
    Icon: AlertCircle,
    confirmClassName: "bg-gradient-to-r from-red-500 to-red-600 text-white hover:opacity-95",
  },
};

export default function ActionDialog({
  open,
  tone = "info",
  title,
  message,
  detailsLabel = "",
  detailsPlaceholder = "",
  detailsValue = "",
  onDetailsChange,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  closeLabel = "Fermer",
  loadingLabel = "...",
  confirmDisabled = false,
  loading = false,
  onConfirm,
  onClose,
}) {
  if (!open) {
    return null;
  }

  const config = toneConfig[tone] || toneConfig.info;
  const Icon = config.Icon;
  const hasConfirmAction = typeof onConfirm === "function";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-[0_32px_90px_-32px_rgba(15,23,42,0.45)]">
        <div className={`h-2 w-full ${config.barClassName}`} />
        <div className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${config.iconWrapClassName}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              {message ? (
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{message}</p>
              ) : null}
            </div>
          </div>

          {typeof onDetailsChange === "function" ? (
            <div className="mt-5 space-y-2">
              {detailsLabel ? (
                <label className="text-sm font-medium text-slate-700">{detailsLabel}</label>
              ) : null}
              <Textarea
                value={detailsValue}
                onChange={(event) => onDetailsChange(event.target.value)}
                placeholder={detailsPlaceholder}
                className="min-h-[130px] rounded-[1.5rem] border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700"
              />
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl border-slate-200 px-5"
              onClick={onClose}
            >
              {hasConfirmAction ? cancelLabel : closeLabel}
            </Button>
            {hasConfirmAction ? (
              <Button
                type="button"
                className={`rounded-2xl px-6 ${config.confirmClassName}`}
                onClick={onConfirm}
                disabled={confirmDisabled || loading}
              >
                {loading ? loadingLabel : confirmLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

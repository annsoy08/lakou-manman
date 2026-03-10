"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  PaymentElement,
  Elements,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, CheckCircle } from "lucide-react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function CheckoutForm({ amount, onSuccess, itemInfo }) {
  const { t } = useLanguage();
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
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
        setMessage("An unexpected error occurred.");
      }
    } else {
      setMessage("Payment successful!");
      setIsComplete(true);
      onSuccess?.();
    }

    setIsLoading(false);
  };

  if (isComplete) {
    return (
      <Card className="rounded-xl border-green-200 bg-green-50">
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            {t("paymentSuccessful")}
          </h3>
          <p className="text-green-600">{t("thankYouForPurchase")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
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
          `${t("payNow")} $${amount.toFixed(2)}`
        )}
      </Button>
    </form>
  );
}

export default function PaymentForm({ amount, itemInfo, onSuccess }) {
  const { t } = useLanguage();
  const [clientSecret, setClientSecret] = useState("");

  React.useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amount * 100, // Convert to cents
        currency: "usd",
      }),
    })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret))
      .catch((error) => console.error("Error:", error));
  }, [amount]);

  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#9B2335',
      colorBackground: '#ffffff',
      colorText: '#1a1a1a',
      colorDanger: '#df1b41',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  };

  const options = {
    clientSecret,
    appearance,
  };

  return (
    <Card className="rounded-xl border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">{t("securePayment")}</CardTitle>
        <div className="text-sm text-slate-600">
          {t("item")}: {itemInfo?.name || t("boutiqueItem")}
        </div>
        <div className="text-2xl font-bold text-[#9B2335]">
          ${amount.toFixed(2)}
        </div>
      </CardHeader>
      <CardContent>
        {clientSecret && (
          <Elements options={options} stripe={stripePromise}>
            <CheckoutForm 
              amount={amount} 
              onSuccess={onSuccess}
              itemInfo={itemInfo}
            />
          </Elements>
        )}
      </CardContent>
    </Card>
  );
}

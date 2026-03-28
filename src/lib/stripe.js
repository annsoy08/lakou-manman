import { loadStripe } from '@stripe/stripe-js';
import { trackError } from '@/lib/telemetry';

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default stripePromise;

// Create a payment intent
export async function createPaymentIntent(amount, currency = 'usd') {
  try {
    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount * 100, // Stripe uses cents
        currency,
      }),
    });

    const { clientSecret } = await response.json();
    return clientSecret;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    trackError(error, {
      scope: 'stripe_create_payment_intent',
      amount,
      currency,
    });
    throw error;
  }
}

// Confirm payment
export async function confirmPayment(clientSecret, paymentMethodId) {
  try {
    const response = await fetch('/api/confirm-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientSecret,
        paymentMethodId,
      }),
    });

    const { paymentIntent } = await response.json();
    return paymentIntent;
  } catch (error) {
    console.error('Error confirming payment:', error);
    trackError(error, {
      scope: 'stripe_confirm_payment',
      clientSecret: String(clientSecret || '').slice(0, 12),
    });
    throw error;
  }
}

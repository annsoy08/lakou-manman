import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request) {
  try {
    const { amount, currency = 'usd' } = await request.json();

    // Check if Stripe secret key is available
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('DEMO MODE: Stripe secret key not configured, using mock clientSecret');
      
      // Generate a mock clientSecret that looks like Stripe's format
      const mockClientSecret = 'pi_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + '_secret_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      return NextResponse.json({
        clientSecret: mockClientSecret,
        demo: true
      });
    }

    // Real Stripe integration
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        source: 'lakou-manman-boutique',
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      demo: false
    });
  } catch (error) {
    console.error('Stripe error:', error);
    
    // Fallback to demo mode if Stripe fails
    console.log('FALLBACK: Using demo mode due to Stripe error');
    const mockClientSecret = 'pi_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + '_secret_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    return NextResponse.json({
      clientSecret: mockClientSecret,
      demo: true,
      error: 'Using demo mode'
    });
  }
}

import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

const DEFAULT_MONCASH_API_BASE_URL = 'https://sandbox.moncashbutton.digicelgroup.com/Api';
const DEFAULT_MONCASH_GATEWAY_BASE_URL = 'https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware';
const MONCASH_REQUEST_TIMEOUT_MS = 15000;
const MAX_PHONE_DIGITS = 15;
const SUPPORTED_PAYMENT_METHODS = new Set(['moncash']);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonNoStore(payload, init = {}) {
  return NextResponse.json(payload, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

function normalizePhoneNumber(value) {
  const rawValue = String(value || '').trim();
  if (!rawValue) {
    return '';
  }

  const hasPlusPrefix = rawValue.startsWith('+');
  const digitsOnly = rawValue.replace(/\D/g, '').slice(0, MAX_PHONE_DIGITS);
  if (!digitsOnly) {
    return '';
  }

  return hasPlusPrefix ? `+${digitsOnly}` : digitsOnly;
}

function maskPhoneNumber(value) {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) {
    return '';
  }

  const digitsOnly = normalizedValue.replace(/\D/g, '');
  if (digitsOnly.length <= 4) {
    return normalizedValue;
  }

  const visibleSuffix = digitsOnly.slice(-4);
  return `***${visibleSuffix}`;
}

function buildTransactionReference(prefix) {
  const normalizedPrefix = String(prefix || 'LM').trim().toUpperCase() || 'LM';
  const timeComponent = Date.now().toString(36).toUpperCase();
  const randomComponent = randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
  return `${normalizedPrefix}-${timeComponent}-${randomComponent}`;
}

function normalizeCurrencyAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.round(amount * 100) / 100;
}

function parseMonCashJsonSafely(rawValue) {
  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

function parseRequestJsonSafely(rawValue) {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

async function readJsonResponseSafely(response) {
  const rawText = await response.text();
  const parsed = parseMonCashJsonSafely(rawText);
  return parsed ?? { raw: rawText };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = MONCASH_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function validatePaymentPayload(payload = {}) {
  const normalizedPaymentMethod = String(payload.paymentMethod || '').trim().toLowerCase();
  const productAmount = normalizeCurrencyAmount(payload.amount);
  const deliveryOption = String(payload.deliveryOption || '').trim().toLowerCase();
  const deliveryFee = deliveryOption === 'delivery' ? normalizeCurrencyAmount(payload.deliveryFee) : 0;
  const totalAmount = normalizeCurrencyAmount(payload.totalAmount) || normalizeCurrencyAmount(productAmount + deliveryFee);
  const itemName = String(payload.itemName || '').trim();
  const phoneNumber = normalizePhoneNumber(payload.phoneNumber);
  const phoneDigits = phoneNumber.replace(/\D/g, '');

  if (!itemName) {
    return { error: "Nom d’article manquant." };
  }

  if (normalizedPaymentMethod && !SUPPORTED_PAYMENT_METHODS.has(normalizedPaymentMethod)) {
    return { error: 'Méthode de paiement non prise en charge.' };
  }

  if (productAmount <= 0 || totalAmount <= 0) {
    return { error: 'Montant de paiement invalide.' };
  }

  if (deliveryFee < 0 || totalAmount < productAmount) {
    return { error: 'Les montants de livraison sont incohérents.' };
  }

  if (normalizedPaymentMethod === 'moncash' && phoneDigits.length < 8) {
    return { error: 'Numéro MonCash invalide.' };
  }

  return {
    value: {
      paymentMethod: normalizedPaymentMethod || 'moncash',
      productAmount,
      deliveryOption,
      deliveryFee,
      payableAmount: totalAmount,
      itemName,
      phoneNumber,
    },
  };
}

function getMonCashApiBaseUrl() {
  return String(process.env.MONCASH_API_BASE_URL || DEFAULT_MONCASH_API_BASE_URL).replace(/\/+$/, '');
}

function getMonCashGatewayBaseUrl() {
  return String(process.env.MONCASH_GATEWAY_BASE_URL || DEFAULT_MONCASH_GATEWAY_BASE_URL).replace(/\/+$/, '');
}

async function getMonCashToken() {
  const clientId = process.env.MONCASH_CLIENT_ID;
  const clientSecret = process.env.MONCASH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.log('MONCASH: Credentials not found');
    return {
      accessToken: null,
      reason: 'missing_credentials',
      details: null
    };
  }

  try {
    const tokenRequestBody = new URLSearchParams({
      scope: 'read,write',
      grant_type: 'client_credentials'
    }).toString();

    const response = await fetchWithTimeout(`${getMonCashApiBaseUrl()}/oauth/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: tokenRequestBody
    });

    const data = await readJsonResponseSafely(response);
    if (!response.ok || !data.access_token) {
      console.error('MONCASH: Token request failed', data);
      return {
        accessToken: null,
        reason: 'token_request_failed',
        details: data
      };
    }

    return {
      accessToken: data.access_token,
      reason: null,
      details: data
    };
  } catch (error) {
    console.error('MONCASH: Token error:', error);
    return {
      accessToken: null,
      reason: 'token_request_error',
      details: error?.message || null
    };
  }
}

export async function POST(request) {
  try {
    const rawPayload = await request.text();
    const requestPayload = parseRequestJsonSafely(rawPayload);

    if (!requestPayload || typeof requestPayload !== 'object' || Array.isArray(requestPayload)) {
      return jsonNoStore(
        {
          success: false,
          error: 'Invalid payment payload',
          message: 'Le format de la requête de paiement est invalide.',
        },
        { status: 400 }
      );
    }

    const moncashApiBaseUrl = getMonCashApiBaseUrl();
    const moncashGatewayBaseUrl = getMonCashGatewayBaseUrl();
    const validationResult = validatePaymentPayload(requestPayload);
    if (!validationResult.value) {
      return jsonNoStore(
        {
          success: false,
          error: 'Invalid payment payload',
          message: validationResult.error || 'Paiement invalide.',
        },
        { status: 400 }
      );
    }
    const {
      productAmount,
      deliveryFee: appliedDeliveryFee,
      payableAmount,
      itemName,
      phoneNumber,
      paymentMethod: normalizedPaymentMethod,
    } = validationResult.value;

    console.log('MONCASH API: Processing payment', {
      amount: payableAmount,
      phoneNumber: maskPhoneNumber(phoneNumber),
      itemName,
      paymentMethod: normalizedPaymentMethod,
    });
    console.log('MONCASH API: Resolved configuration', {
      apiBaseUrl: moncashApiBaseUrl,
      gatewayBaseUrl: moncashGatewayBaseUrl,
    });

    // Calculate commission (10% for Lakou Manman)
    const commissionRate = 0.10;
    const commission = productAmount * commissionRate;
    const sellerAmount = productAmount - commission;
    const orderId = buildTransactionReference('LM');

    // Try real MonCash API first
    const allowDemoMode = process.env.MONCASH_ALLOW_DEMO === 'true';
    const {
      accessToken: moncashToken,
      reason: moncashTokenReason,
      details: moncashTokenDetails
    } = await getMonCashToken();

    if (!moncashToken && !allowDemoMode) {
      const message = moncashTokenReason === 'missing_credentials'
        ? "MonCash réel n’est pas configuré. Ajoutez MONCASH_CLIENT_ID, MONCASH_CLIENT_SECRET et NEXT_PUBLIC_URL."
        : "Impossible d’initialiser MonCash réel pour le moment. Vérifiez les identifiants et la connectivité.";

      return jsonNoStore(
        {
          success: false,
          error: 'MonCash unavailable',
          message,
          reason: moncashTokenReason,
          details: moncashTokenDetails,
          demoMode: false,
        },
        { status: 503 }
      );
    }
    
    if (moncashToken) {
      console.log('MONCASH: Using real API');
      
      try {
        // REAL MONCASH API CALL
        const moncashResponse = await fetchWithTimeout(`${moncashApiBaseUrl}/v1/CreatePayment`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${moncashToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: Math.round(payableAmount),
            orderId,
          })
        });

        const moncashData = await readJsonResponseSafely(moncashResponse);
        const paymentToken = String(moncashData?.payment_token?.token || '').trim();
        
        if (moncashResponse.ok && paymentToken) {
          const paymentData = {
            success: true,
            transactionId: orderId,
            referenceNumber: orderId,
            amount: payableAmount,
            productAmount: productAmount,
            deliveryFee: appliedDeliveryFee,
            totalAmount: payableAmount,
            commission: commission,
            sellerAmount: sellerAmount,
            commissionRate: commissionRate,
            currency: 'HTG',
            status: 'pending', // Waiting for SMS confirmation
            timestamp: new Date().toISOString(),
            customerPhone: phoneNumber,
            paymentMethod: normalizedPaymentMethod,
            itemName: itemName,
            paymentToken,
            paymentUrl: `${moncashGatewayBaseUrl}/Payment/Redirect?token=${encodeURIComponent(paymentToken)}`,
            realMonCash: true,
            moncashMode: moncashData?.mode || ''
          };
          
          console.log('MONCASH REAL SUCCESS:', {
            transactionId: paymentData.transactionId,
            amount: paymentData.amount,
            paymentMethod: paymentData.paymentMethod,
            realMonCash: paymentData.realMonCash,
            moncashMode: paymentData.moncashMode,
          });
          return jsonNoStore(paymentData);
        } else {
          console.log('MONCASH: Real API failed, falling back to demo');
          if (!allowDemoMode) {
            return jsonNoStore(
              {
                success: false,
                error: 'MonCash payment creation failed',
                message: moncashData?.message || 'La création du paiement MonCash a échoué.',
                details: moncashData,
                demoMode: false,
              },
              { status: 502 }
            );
          }
        }
      } catch (apiError) {
        console.error('MONCASH: Real API error:', apiError);
        if (!allowDemoMode) {
          return jsonNoStore(
            {
              success: false,
              error: 'MonCash payment request failed',
              message: apiError?.message || 'La requête MonCash a échoué.',
              demoMode: false,
            },
            { status: 502 }
          );
        }
        console.log('MONCASH: Falling back to demo mode');
      }
    }
    
    console.log('MONCASH: Using demo/simulation mode');
    
    const transactionId = buildTransactionReference('MC');
    const referenceNumber = buildTransactionReference('REF');
    
    const paymentData = {
      success: true,
      transactionId: transactionId,
      referenceNumber: referenceNumber,
      amount: payableAmount,
      productAmount: productAmount,
      deliveryFee: appliedDeliveryFee,
      totalAmount: payableAmount,
      commission: commission,
      sellerAmount: sellerAmount,
      commissionRate: commissionRate,
      currency: 'HTG',
      status: 'completed',
      timestamp: new Date().toISOString(),
      customerPhone: phoneNumber,
      paymentMethod: normalizedPaymentMethod,
      itemName: itemName,
      realMonCash: false,
      demoMode: true
    };
    
    console.log('MONCASH DEMO SUCCESS:', {
      transactionId,
      amount: payableAmount,
      commission,
      sellerAmount,
      customerPhone: maskPhoneNumber(phoneNumber)
    });
    
    return jsonNoStore(paymentData);
    
  } catch (error) {
    console.error('MONCASH API ERROR:', error);
    return jsonNoStore(
      { 
        success: false, 
        error: 'Payment processing failed',
        message: String(error?.message || 'Unexpected payment error') 
      },
      { status: 500 }
    );
  }
}

// For real MonCash integration, you would need:

/*
1. MONCASH CREDENTIALS:
   - Client ID: process.env.MONCASH_CLIENT_ID
   - Client Secret: process.env.MONCASH_CLIENT_SECRET
   - API Base URL: process.env.MONCASH_API_BASE_URL || https://sandbox.moncashbutton.digicelgroup.com/MerChantApi

2. REAL API ENDPOINTS:
   - OAuth Token: POST {MONCASH_API_BASE_URL}/oauth/token
   - Create Payment: POST {MONCASH_API_BASE_URL}/V1/Payment

3. PAYMENT FLOW:
   a) Create payment request with amount and phone
   b) MonCash sends SMS to customer
   c) Customer confirms via SMS or USSD
   d) MonCash sends webhook confirmation
   e) Update order status

4. COMMISSION TRACKING:
   - Store transactions in database
   - Track commission amounts
   - Generate commission reports
   - Handle payout to sellers

5. SECURITY:
   - HMAC signature verification
   - Transaction idempotency
   - Rate limiting
   - Fraud detection

Example real implementation:

const moncash = require('moncash-sdk');

const payment = await moncash.createPayment({
  amount: amount * 100, // Convert to cents
  currency: 'HTG',
  phone: phoneNumber,
  description: itemName,
  callback_url: `${process.env.NEXT_PUBLIC_URL}/api/moncash-webhook`
});

return {
  success: true,
  transactionId: payment.transaction_id,
  paymentUrl: payment.payment_url
};
*/

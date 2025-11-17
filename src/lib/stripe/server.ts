/**
 * Stripe server-side utilities
 *
 * Use these functions in API routes and Server Actions for subscription management
 */

import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}

// Initialize Stripe with API version
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
  typescript: true,
});

/**
 * Pricing tiers for Coach Portal subscriptions
 */
export const PRICING_TIERS = {
  FREE: {
    tier: 0,
    name: "Free",
    price: 0,
    priceId: null,
    features: {
      csv_export_limit: 10,
      analytics_enabled: false,
      see_all_athletes: false,
      priority_support: false,
    },
  },
  PREMIUM: {
    tier: 1,
    name: "Premium",
    price: 4900, // $49/month in cents
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID,
    features: {
      csv_export_limit: 999999, // Unlimited
      analytics_enabled: true,
      see_all_athletes: true,
      priority_support: true,
    },
  },
  ENTERPRISE: {
    tier: 2,
    name: "Enterprise",
    price: null, // Custom pricing
    priceId: null,
    features: {
      csv_export_limit: 999999,
      analytics_enabled: true,
      see_all_athletes: true,
      priority_support: true,
    },
  },
} as const;

/**
 * Create a checkout session for upgrading to premium
 */
export async function createCheckoutSession({
  programId,
  userId,
  userEmail,
  successUrl,
  cancelUrl,
}: {
  programId: string;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  if (!PRICING_TIERS.PREMIUM.priceId) {
    throw new Error("STRIPE_PREMIUM_PRICE_ID is not configured");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: PRICING_TIERS.PREMIUM.priceId,
        quantity: 1,
      },
    ],
    customer_email: userEmail,
    client_reference_id: userId,
    metadata: {
      program_id: programId,
      user_id: userId,
    },
    subscription_data: {
      metadata: {
        program_id: programId,
        user_id: userId,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
}

/**
 * Create a billing portal session for managing subscriptions
 */
export async function createBillingPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Get subscription details by ID
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error("Failed to retrieve subscription:", error);
    return null;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.cancel(subscriptionId);
}

/**
 * Construct webhook event from request
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

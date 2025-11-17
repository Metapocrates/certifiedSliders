/**
 * Stripe webhook handler
 *
 * Handles subscription lifecycle events:
 * - checkout.session.completed: New subscription created
 * - customer.subscription.updated: Subscription plan/status changed
 * - customer.subscription.deleted: Subscription canceled
 */

import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent, PRICING_TIERS } from "@/lib/stripe/server";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

// Create Supabase admin client for webhook operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = constructWebhookEvent(body, signature);
  } catch (err) {
    console.error("⚠️  Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  console.log(`✅ Received webhook event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout - upgrade program to premium
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { program_id, user_id } = session.metadata || {};
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  if (!program_id || !user_id) {
    console.error("Missing metadata in checkout session:", session.id);
    return;
  }

  console.log(`Upgrading program ${program_id} to premium (subscription: ${subscriptionId})`);

  // Update or create program entitlements
  const { error: upsertError } = await supabase
    .from("program_entitlements")
    .upsert(
      {
        program_id,
        tier: PRICING_TIERS.PREMIUM.tier,
        features: PRICING_TIERS.PREMIUM.features,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        expires_at: null, // Active subscription, no expiry
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "program_id",
      }
    );

  if (upsertError) {
    console.error("Failed to update program entitlements:", upsertError);
    throw upsertError;
  }

  // Log to audit trail
  await supabase.from("audit_log").insert({
    actor_user_id: user_id,
    action: "subscription_created",
    entity: "program",
    entity_id: program_id,
    context: {
      subscription_id: subscriptionId,
      customer_id: customerId,
      tier: PRICING_TIERS.PREMIUM.tier,
    },
  });

  console.log(`✅ Program ${program_id} upgraded to premium`);
}

/**
 * Handle subscription updates (plan changes, status changes)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const { program_id, user_id } = subscription.metadata;
  const status = subscription.status;

  if (!program_id) {
    console.error("Missing program_id in subscription metadata:", subscription.id);
    return;
  }

  console.log(`Subscription ${subscription.id} status: ${status}`);

  // If subscription is canceled/unpaid, downgrade to free
  if (["canceled", "unpaid", "past_due"].includes(status)) {
    const { error } = await supabase
      .from("program_entitlements")
      .update({
        tier: PRICING_TIERS.FREE.tier,
        features: PRICING_TIERS.FREE.features,
        updated_at: new Date().toISOString(),
      })
      .eq("program_id", program_id);

    if (error) {
      console.error("Failed to downgrade program:", error);
      throw error;
    }

    await supabase.from("audit_log").insert({
      actor_user_id: user_id || null,
      action: "subscription_downgraded",
      entity: "program",
      entity_id: program_id,
      context: {
        subscription_id: subscription.id,
        reason: status,
      },
    });

    console.log(`✅ Program ${program_id} downgraded to free tier`);
  }

  // If subscription is active again, upgrade to premium
  if (status === "active") {
    const { error } = await supabase
      .from("program_entitlements")
      .update({
        tier: PRICING_TIERS.PREMIUM.tier,
        features: PRICING_TIERS.PREMIUM.features,
        expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("program_id", program_id);

    if (error) {
      console.error("Failed to upgrade program:", error);
      throw error;
    }

    console.log(`✅ Program ${program_id} re-activated to premium`);
  }
}

/**
 * Handle subscription deletion - downgrade to free tier
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { program_id, user_id } = subscription.metadata;

  if (!program_id) {
    console.error("Missing program_id in subscription metadata:", subscription.id);
    return;
  }

  console.log(`Subscription ${subscription.id} deleted, downgrading program ${program_id}`);

  const { error } = await supabase
    .from("program_entitlements")
    .update({
      tier: PRICING_TIERS.FREE.tier,
      features: PRICING_TIERS.FREE.features,
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("program_id", program_id);

  if (error) {
    console.error("Failed to downgrade program:", error);
    throw error;
  }

  await supabase.from("audit_log").insert({
    actor_user_id: user_id || null,
    action: "subscription_canceled",
    entity: "program",
    entity_id: program_id,
    context: {
      subscription_id: subscription.id,
    },
  });

  console.log(`✅ Program ${program_id} downgraded to free tier`);
}

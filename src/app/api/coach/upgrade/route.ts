/**
 * Coach subscription upgrade API
 *
 * Creates a Stripe checkout session for upgrading a program to premium tier
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { createCheckoutSession, createBillingPortalSession } from "@/lib/stripe/server";
import { getAppBaseUrl } from "@/lib/env";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { program_id, action } = await request.json();

  if (!program_id) {
    return NextResponse.json(
      { error: "Missing program_id" },
      { status: 400 }
    );
  }

  // Verify user has access to this program
  const { data: membership } = await supabase
    .from("program_memberships")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("program_id", program_id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { error: "Access denied - you are not a member of this program" },
      { status: 403 }
    );
  }

  // Only coordinators/admins can manage billing
  if (!["coordinator", "admin"].includes(membership.role)) {
    return NextResponse.json(
      { error: "Only coordinators and admins can manage billing" },
      { status: 403 }
    );
  }

  const baseUrl = getAppBaseUrl();

  try {
    // If action is "manage" and they already have a subscription, redirect to billing portal
    if (action === "manage") {
      const { data: entitlement } = await supabase
        .from("program_entitlements")
        .select("stripe_customer_id, tier")
        .eq("program_id", program_id)
        .maybeSingle();

      if (entitlement?.stripe_customer_id && entitlement.tier > 0) {
        const session = await createBillingPortalSession({
          customerId: entitlement.stripe_customer_id,
          returnUrl: `${baseUrl}/coach/portal?billing=success`,
        });

        return NextResponse.json({ url: session.url });
      }

      // If no subscription yet, fall through to create checkout session
    }

    // Create Stripe checkout session
    const session = await createCheckoutSession({
      programId: program_id,
      userId: user.id,
      userEmail: user.email || "",
      successUrl: `${baseUrl}/coach/portal?upgrade=success`,
      cancelUrl: `${baseUrl}/coach/portal?upgrade=canceled`,
    });

    // Log upgrade attempt to audit log
    await supabase.from("audit_log").insert({
      actor_user_id: user.id,
      action: "subscription_checkout_started",
      entity: "program",
      entity_id: program_id,
      context: {
        checkout_session_id: session.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Failed to create checkout session:", error);

    // Check if it's a Stripe configuration error
    if (error instanceof Error && error.message.includes("not configured")) {
      return NextResponse.json(
        { error: "Stripe is not properly configured. Please contact support." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function POST(request: Request) {
  const supabase = createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get request body
  const body = await request.json();
  const { challenge_id } = body;

  if (!challenge_id) {
    return NextResponse.json({ error: "Missing challenge_id" }, { status: 400 });
  }

  // Get challenge
  const { data: challenge, error: fetchError } = await supabase
    .from("coach_domain_challenges")
    .select("*")
    .eq("id", challenge_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  // Check if already verified
  if (challenge.status === "verified") {
    return NextResponse.json({ success: true, already_verified: true });
  }

  // Check if expired
  if (new Date(challenge.expires_at) < new Date()) {
    await supabase
      .from("coach_domain_challenges")
      .update({ status: "expired" })
      .eq("id", challenge_id);

    return NextResponse.json({ error: "Challenge expired" }, { status: 400 });
  }

  let verified = false;
  let errorMessage = null;

  try {
    if (challenge.method === "dns") {
      // Check DNS TXT record
      verified = await verifyDNS(challenge.domain, challenge.nonce);
      if (!verified) {
        errorMessage = `DNS TXT record not found. Expected: certified-sliders-verify=${challenge.nonce}`;
      }
    } else if (challenge.method === "http") {
      // Check HTTP file
      verified = await verifyHTTP(challenge.domain, challenge.nonce);
      if (!verified) {
        errorMessage = `Verification file not found or content mismatch at https://${challenge.domain}/.well-known/certified-sliders-verify.txt`;
      }
    }
  } catch (err: any) {
    errorMessage = err.message || "Verification failed";
    console.error("Verification error:", err);
  }

  // Update challenge status
  const { error: updateError } = await supabase
    .from("coach_domain_challenges")
    .update({
      status: verified ? "verified" : "failed",
      verified_at: verified ? new Date().toISOString() : null,
      error_message: errorMessage,
    })
    .eq("id", challenge_id);

  if (updateError) {
    console.error("Error updating challenge:", updateError);
  }

  if (verified) {
    // Re-compute verification score
    await supabase.rpc("rpc_update_coach_verification", {
      _user_id: user.id,
      _program_id: challenge.program_id,
    });

    return NextResponse.json({ success: true, verified: true });
  } else {
    return NextResponse.json(
      { success: false, verified: false, error: errorMessage },
      { status: 400 }
    );
  }
}

// DNS verification using Node.js dns.resolveTxt
async function verifyDNS(domain: string, expectedNonce: string): Promise<boolean> {
  try {
    const dns = await import("dns/promises");
    const records = await dns.resolveTxt(domain);

    // Check if any TXT record matches our verification format
    for (const record of records) {
      const txt = record.join("");
      if (txt === `certified-sliders-verify=${expectedNonce}`) {
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error("DNS verification error:", err);
    return false;
  }
}

// HTTP verification by fetching the verification file
async function verifyHTTP(domain: string, expectedNonce: string): Promise<boolean> {
  try {
    const url = `https://${domain}/.well-known/certified-sliders-verify.txt`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "Certified Sliders Verification Bot" },
    });

    if (!response.ok) {
      return false;
    }

    const content = await response.text();
    return content.trim() === expectedNonce.trim();
  } catch (err) {
    console.error("HTTP verification error:", err);
    return false;
  }
}

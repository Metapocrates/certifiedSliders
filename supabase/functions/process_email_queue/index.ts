// Supabase Edge Function: Process Email Queue
// Processes queued emails and sends them via Resend
// Schedule this to run every 1-5 minutes via Supabase Dashboard

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("MAIL_FROM") || "noreply@certifiedsliders.com";
const FROM_NAME = Deno.env.get("MAIL_FROM_NAME") || "Certified Sliders";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Email {
  id: number;
  to_email: string;
  to_name: string | null;
  subject: string;
  body_text: string;
  body_html: string | null;
  template: string;
  meta: Record<string, any>;
}

async function sendEmail(email: Email) {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [email.to_email],
      subject: email.subject,
      text: email.body_text,
      html: email.body_html || undefined,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Resend error: ${res.status} ${errorText}`);
  }
}

async function processQueue() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Fetch up to 100 queued emails
  const { data: emails, error: fetchError } = await supabase
    .from("outbound_emails")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(100);

  if (fetchError) {
    console.error("Failed to fetch emails:", fetchError);
    throw fetchError;
  }

  if (!emails || emails.length === 0) {
    console.log("No emails in queue");
    return { processed: 0, sent: 0, failed: 0 };
  }

  console.log(`Processing ${emails.length} queued emails`);

  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    try {
      await sendEmail(email);

      // Mark as sent
      await supabase
        .from("outbound_emails")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", email.id);

      // Log to audit_log
      await supabase
        .from("audit_log")
        .insert({
          action: "email_sent",
          entity: "outbound_email",
          entity_id: null, // email.id is bigserial, not uuid
          context: {
            email_id: email.id,
            template: email.template,
            to_email: email.to_email,
            subject: email.subject,
            meta: email.meta,
          },
        });

      sent++;
      console.log(`✓ Sent email ${email.id} (${email.template}) to ${email.to_email}`);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);

      // Mark as failed
      await supabase
        .from("outbound_emails")
        .update({
          status: "failed",
          error: errorMessage,
        })
        .eq("id", email.id);

      // Log to audit_log
      await supabase
        .from("audit_log")
        .insert({
          action: "email_failed",
          entity: "outbound_email",
          entity_id: null, // email.id is bigserial, not uuid
          context: {
            email_id: email.id,
            template: email.template,
            to_email: email.to_email,
            subject: email.subject,
            error: errorMessage,
            meta: email.meta,
          },
        });

      failed++;
      console.error(`✗ Failed to send email ${email.id} (${email.template}):`, error);
    }
  }

  return { processed: emails.length, sent, failed };
}

// For scheduled invocation (Supabase Cron)
export const scheduled = async () => {
  console.log("=== Starting scheduled email queue processing ===");
  const result = await processQueue();
  console.log(`=== Finished: ${result.sent} sent, ${result.failed} failed ===`);
};

// For manual HTTP invocation (optional)
Deno.serve(async (req) => {
  console.log("=== Manual email queue processing triggered ===");

  try {
    const result = await processQueue();

    return new Response(
      JSON.stringify({
        ok: true,
        ...result,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Queue processing failed:", error);

    return new Response(
      JSON.stringify({
        ok: false,
        error: error?.message || String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

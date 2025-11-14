// Supabase Edge Function: Process Email Queue
// Processes queued emails and sends them via SendGrid
// Schedule this to run every 1-5 minutes via Supabase Dashboard

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
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
  if (!SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY not configured");
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: email.to_email, name: email.to_name || undefined }],
        },
      ],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: email.subject,
      content: [
        { type: "text/plain", value: email.body_text },
        ...(email.body_html ? [{ type: "text/html", value: email.body_html }] : []),
      ],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`SendGrid error: ${res.status} ${errorText}`);
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

#!/usr/bin/env node

import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const { error, count } = await supabase
  .from("external_identities")
  .delete({ count: "exact" })
  .not("id", "is", null);

if (error) {
  console.error("Failed to clear external_identities table:", error.message);
  process.exit(1);
}

console.log(`Deleted ${count ?? 0} linked profile records.`);

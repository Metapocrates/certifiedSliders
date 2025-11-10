/**
 * src/app/api/env-check/route.ts
 *
 * Runtime API endpoint to verify environment variables are set
 * GET /api/env-check
 *
 * Returns:
 * - 200 if all required vars are set
 * - 500 if any required vars are missing
 */

import { NextResponse } from 'next/server';

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
];

export async function GET() {
  const missing: string[] = [];
  const present: string[] = [];

  REQUIRED_VARS.forEach((varName) => {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
    } else {
      present.push(varName);
    }
  });

  const allPresent = missing.length === 0;

  return NextResponse.json(
    {
      ok: allPresent,
      environment: process.env.NODE_ENV || 'development',
      required: REQUIRED_VARS.length,
      present: present.length,
      missing: missing.length,
      missingVars: missing,
      message: allPresent
        ? 'All required environment variables are set'
        : `Missing ${missing.length} required variable(s)`,
    },
    { status: allPresent ? 200 : 500 }
  );
}

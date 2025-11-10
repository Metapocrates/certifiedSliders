export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getEnvironment, SITE_URL, IS_PROD, IS_STAGING, IS_LOCAL } from "@/lib/env";


export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const envOk = Boolean(url && key);

    let dbOk = false, error: string | null = null;
    if (envOk) {
        const supabase = createClient(url!, key!);
        const { error: e } = await supabase
            .from("mv_best_event")
            .select("*", { head: true, count: "exact" })
            .limit(1);
        if (e) error = e.message; else dbOk = true;
    }

    return NextResponse.json({
        envOk,
        dbOk,
        error,
        environment: getEnvironment(),
        siteUrl: SITE_URL || 'not set',
        isProd: IS_PROD,
        isStaging: IS_STAGING,
        isLocal: IS_LOCAL,
        supabaseUrl: url ? url.substring(0, 30) + '...' : 'not set',
    }, { status: envOk ? 200 : 500 });
}

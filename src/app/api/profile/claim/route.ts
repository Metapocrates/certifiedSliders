import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function supabaseServer() {
    const cookieStore = cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options?: any) {
                    cookieStore.set({ name, value, ...options });
                },
                remove(name: string, options?: any) {
                    cookieStore.delete({ name, ...options });
                },
            },
        }
    );
}

export async function POST(req: Request) {
    try {
        const { token } = await req.json();
        if (!token) {
            return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
        }

        const supabase = supabaseServer();
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) {
            return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
        }

        const { data: prof, error: findErr } = await supabase
            .from("profiles")
            .select("id, claimed_by, claim_token")
            .eq("claim_token", token)
            .single();

        if (findErr || !prof) {
            return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 404 });
        }
        if (prof.claimed_by) {
            return NextResponse.json({ ok: false, error: "Already claimed" }, { status: 409 });
        }

        const { error: updErr } = await supabase
            .from("profiles")
            .update({ claimed_by: uid, claimed_at: new Date().toISOString(), claim_token: null })
            .eq("id", prof.id);

        if (updErr) {
            return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
    }
}
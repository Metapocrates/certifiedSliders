import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "../../../../lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const ALLOWED = new Set([3, 4, 5]);

export async function POST(req: NextRequest) {
    // 1) Caller must be logged in
    const userClient = await supabaseServer();
    const {
        data: { user },
        error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // 2) Caller must be an admin (checked via user session + RLS)
    const { data: adminRow, error: adminErr } = await userClient
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (adminErr) return Response.json({ error: adminErr.message }, { status: 500 });
    if (!adminRow) return Response.json({ error: "Forbidden (not admin)" }, { status: 403 });

    // 3) Parse body
    const body = await req.json().catch(() => ({}));
    const username = (body?.username ?? "").toString().trim();
    const starInput = body?.star;
    const star_rating =
        starInput === null || starInput === undefined || starInput === "" ? null : Number(starInput);

    if (!username) return Response.json({ error: "Missing 'username'" }, { status: 400 });
    if (!(star_rating === null || ALLOWED.has(star_rating))) {
        return Response.json({ error: "Invalid 'star' (use null, 3, 4, or 5)" }, { status: 400 });
    }

    // 4) Look up profile (user client is fine for reads)
    const { data: profile, error: profErr } = await userClient
        .from("profiles")
        .select("id, username, star_rating")
        .eq("username", username)
        .maybeSingle();

    if (profErr) return Response.json({ error: profErr.message }, { status: 500 });
    if (!profile) return Response.json({ error: "Profile not found" }, { status: 404 });

    const before = profile.star_rating;

    // 5) Do the UPDATE with the service role (bypasses any RLS weirdness)
    const admin = createSupabaseAdmin();
    const { error: updErr } = await admin
        .from("profiles")
        .update({ star_rating })
        .eq("id", profile.id);

    if (updErr) return Response.json({ error: updErr.message }, { status: 500 });

    // 6) Re-fetch using admin client and revalidate the athlete page
    const { data: afterProfile, error: afterErr } = await admin
        .from("profiles")
        .select("id, username, star_rating")
        .eq("id", profile.id)
        .maybeSingle();

    try {
        revalidatePath(`/athletes/${username}`);
    } catch { }

    if (afterErr || !afterProfile) {
        return Response.json(
            { ok: true, username, before, after: null, note: "Updated but re-fetch failed" },
            { status: 200 }
        );
    }

    return Response.json(
        { ok: true, username: afterProfile.username, before, after: afterProfile.star_rating, profile: afterProfile },
        { status: 200 }
    );
}

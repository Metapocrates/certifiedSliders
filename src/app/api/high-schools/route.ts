import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function normalizeState(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(trimmed) ? trimmed : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawState = searchParams.get("state");
  const state = normalizeState(rawState);

  if (!state) {
    return NextResponse.json(
      { error: "Provide a valid 2-letter state code." },
      { status: 400 }
    );
  }

  const query = (searchParams.get("q") ?? "").trim();
  if (query.length < 2) {
    return NextResponse.json({ data: [] });
  }

  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("schools_highschool")
      .select("school_name, city, state, address, nces_id")
      .eq("state", state)
      .ilike("school_name", `%${query}%`)
      .order("school_name", { ascending: true })
      .limit(40);

    if (error) {
      console.error("[high-schools] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const unique: {
      school_name: string;
      city: string | null;
      state: string;
      address: string | null;
      nces_id: string | null;
    }[] = [];
    const seen = new Set<string>();

    for (const row of data ?? []) {
      const school = (row.school_name ?? "").trim();
      if (!school) continue;
      const city = row.city ?? "";
      const address = row.address ?? "";
      const key = `${school.toLowerCase()}|${city.toLowerCase()}|${address.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push({
        school_name: school,
        city: row.city ?? null,
        state: row.state ?? state,
        address: row.address ?? null,
        nces_id: row.nces_id ?? null,
      });
      if (unique.length >= 25) break;
    }

    return NextResponse.json({ data: unique });
  } catch (err) {
    console.error("[high-schools] Unexpected error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to search high schools.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// src/components/home/FeaturedProfilesCarousel.tsx
import "server-only";
import Image from "next/image";
import SafeLink from "@/components/SafeLink";
import { createSupabaseServer } from "@/lib/supabase/compat";

export const revalidate = 300;

type Card = {
    id: string;
    username: string | null;
    full_name: string | null;
    class_year: number | null;
    school_name: string | null;
    school_state: string | null;
    profile_pic_url: string | null;
    // tiny summary line, e.g. "110H 14.76 • 400H 53.76"
    blurb: string;
};

function fmtTime(sec: number | null | undefined, text?: string | null) {
    if (text) return text;
    if (sec == null) return "—";
    const mm = Math.floor(sec / 60);
    const ss = sec % 60;
    return mm > 0 ? `${mm}:${ss.toFixed(2).padStart(5, "0")}` : ss.toFixed(2);
}

export default async function FeaturedProfilesCarousel() {
    const supabase = createSupabaseServer();

    // Strategy:
    // 1) If a curated list exists in `featured_profiles`, use it (joins to profiles).
    // 2) Otherwise, fall back to top star-rated profiles as a sensible default.
    // Both paths shape into Card[].

    let cards: Card[] = [];

    // --- (1) curated list
    try {
        const { data: curated } = await supabase
            .from("featured_profiles")
            .select(
                `
        profile_id,
        sort_order,
        profiles:profile_id (
          id, username, full_name, class_year, school_name, school_state, profile_pic_url
        )
      `
            )
            .order("sort_order", { ascending: true })
            .limit(20);

        if (curated && curated.length > 0) {
            cards = curated
                .map((row: any) => {
                    const p = row.profiles;
                    return p
                        ? {
                            id: p.id,
                            username: p.username,
                            full_name: p.full_name,
                            class_year: p.class_year,
                            school_name: p.school_name,
                            school_state: p.school_state,
                            profile_pic_url: p.profile_pic_url,
                            blurb: "",
                        }
                        : null;
                })
                .filter(Boolean) as Card[];
        }
    } catch {
        // ignore; fall through to fallback
    }

    // --- (2) fallback to top star-rated profiles
    if (cards.length === 0) {
        try {
            const { data: top } = await supabase
                .from("profiles")
                .select(
                    "id, username, full_name, class_year, school_name, school_state, profile_pic_url, star_rating"
                )
                .not("username", "is", null)
                .order("star_rating", { ascending: false })
                .order("class_year", { ascending: true })
                .limit(20);

            cards =
                (top ?? []).map((p: any) => ({
                    id: p.id,
                    username: p.username,
                    full_name: p.full_name,
                    class_year: p.class_year,
                    school_name: p.school_name,
                    school_state: p.school_state,
                    profile_pic_url: p.profile_pic_url,
                    blurb: "",
                })) ?? [];
        } catch {
            // no-op
        }
    }

    if (cards.length === 0) {
        return (
            <div className="rounded-3xl border border-app bg-muted px-6 py-12 text-center text-sm text-muted shadow-inner">
                No featured athletes yet. Check back after the next verification wave.
            </div>
        );
    }

    // Fetch up to 2 best events for each athlete to build a short blurb.
    // We do this in one query using IN(list of ids) against mv_best_event, then group.
    try {
        const ids = cards.map((c) => c.id);
        const { data: best } = await supabase
            .from("mv_best_event")
            .select(
                "athlete_id, event, best_seconds_adj, best_mark_text"
            )
            .in("athlete_id", ids)
            .order("best_seconds_adj", { ascending: true, nullsFirst: false });

        const perAth: Record<
            string,
            { event: string; text: string; sec: number | null }[]
        > = {};
        for (const r of best ?? []) {
            const list = (perAth[r.athlete_id] ||= []);
            if (list.length < 2) {
                list.push({
                    event: r.event,
                    text: fmtTime(r.best_seconds_adj, r.best_mark_text),
                    sec: r.best_seconds_adj ?? null,
                });
            }
        }
        cards = cards.map((c) => {
            const evs = perAth[c.id] || [];
            const blurb =
                evs.length > 0
                    ? evs.map((e) => `${e.event} ${e.text}`).join(" • ")
                    : "";
            return { ...c, blurb };
        });
    } catch {
        // if it fails, we just omit blurbs
    }

    return (
        <section className="space-y-3">
            {/* <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Featured Athletes</h2>
            </div> */}

            <div className="no-scrollbar -mx-4 overflow-x-auto px-4 py-1">
                <ul className="flex gap-4">
                    {cards.map((c) => {
                        const href = c.username ? `/athletes/${c.username}` : undefined;
                        const subtitleParts = [
                            c.school_name
                                ? `${c.school_name}${c.school_state ? `, ${c.school_state}` : ""}`
                                : null,
                            c.class_year ? `Class of ${c.class_year}` : null,
                        ].filter(Boolean);

                        return (
                            <li
                                key={c.id}
                                className="group relative w-64 shrink-0 overflow-hidden rounded-2xl border border-app bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                            >
                                <SafeLink href={href} className="block">
                                    <div className="relative h-36 w-full overflow-hidden bg-neutral-100">
                                        {c.profile_pic_url ? (
                                            <Image
                                                src={c.profile_pic_url}
                                                alt={c.full_name || c.username || "Athlete"}
                                                fill
                                                sizes="256px"
                                                className="object-cover transition duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="grid h-full place-items-center text-3xl text-neutral-400">
                                                🙂
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1 p-4">
                                        <div className="truncate text-sm font-semibold text-app">
                                            {c.full_name || c.username}
                                        </div>
                                        {subtitleParts.length > 0 ? (
                                            <div className="truncate text-xs text-muted">
                                                {subtitleParts.join(" • ")}
                                            </div>
                                        ) : null}
                                        {c.blurb ? (
                                            <div className="truncate text-xs text-app opacity-80">
                                                {c.blurb}
                                            </div>
                                        ) : null}
                                    </div>
                                </SafeLink>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </section>
    );
}

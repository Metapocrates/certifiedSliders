// src/components/home/FeaturedProfilesCarousel.tsx
import "server-only";
import Image from "next/image";
import ImageWithFallback from "@/components/ImageWithFallback";
import SafeLink from "@/components/SafeLink";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getStarTierAccent } from "@/lib/star-theme";

export const revalidate = 300;

type Card = {
    id: string;
    username: string | null;
    full_name: string | null;
    class_year: number | null;
    school_name: string | null;
    school_state: string | null;
    profile_pic_url: string | null;
    star_rating: number | null;
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
    const supabase = await createSupabaseServer();

    // Strategy:
    // 1) Get manually featured athletes (featured=true, 3-5 stars)
    // 2) Randomly select from 3-5 star pool to fill remaining slots (up to 10 total)

    let cards: Card[] = [];
    const limit = 10;

    // --- (1) Get manually featured athletes
    const { data: manuallyFeatured } = await supabase
        .from("profiles")
        .select(
            "id, username, full_name, star_rating, class_year, school_name, school_state, profile_pic_url"
        )
        .eq("featured", true)
        .eq("user_type", "athlete")
        .not("profile_pic_url", "is", null)
        .gte("star_rating", 3)
        .lte("star_rating", 5)
        .order("star_rating", { ascending: false, nullsFirst: false });

    const manualCount = manuallyFeatured?.length ?? 0;
    const remainingSlots = Math.max(0, limit - manualCount);

    cards = [...(manuallyFeatured ?? [])].map((p: any) => ({
        id: p.id,
        username: p.username,
        full_name: p.full_name,
        class_year: p.class_year,
        school_name: p.school_name,
        school_state: p.school_state,
        profile_pic_url: p.profile_pic_url,
        star_rating: p.star_rating,
        blurb: "",
    }));

    // --- (2) If we need more, get random athletes from 3-5 star pool
    if (remainingSlots > 0) {
        const manualIds = (manuallyFeatured ?? []).map((p) => p.id);

        // Get a pool of candidates and shuffle client-side
        const { data: candidatePool } = await supabase
            .from("profiles")
            .select(
                "id, username, full_name, star_rating, class_year, school_name, school_state, profile_pic_url"
            )
            .eq("user_type", "athlete")
            .or("featured.is.null,featured.eq.false")
            .not("profile_pic_url", "is", null)
            .gte("star_rating", 3)
            .lte("star_rating", 5)
            .limit(50); // Get a pool to randomize from

        if (candidatePool && candidatePool.length > 0) {
            // Filter out manually featured IDs
            const filtered = candidatePool.filter((p) => !manualIds.includes(p.id));

            // Shuffle array using Fisher-Yates algorithm
            const shuffled = [...filtered];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            // Take only what we need and map to Card format
            const randomCards = shuffled.slice(0, remainingSlots).map((p: any) => ({
                id: p.id,
                username: p.username,
                full_name: p.full_name,
                class_year: p.class_year,
                school_name: p.school_name,
                school_state: p.school_state,
                profile_pic_url: p.profile_pic_url,
                star_rating: p.star_rating,
                blurb: "",
            }));

            cards.push(...randomCards);
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
        <section className="space-y-4">
            <div className="relative">
                {/* Fade indicators for scroll hint */}
                <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-8 bg-gradient-to-r from-background to-transparent" />
                <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-background to-transparent" />

                <div className="-mx-4 overflow-x-auto px-4 py-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400" style={{ scrollSnapType: 'x mandatory', scrollPaddingLeft: '1rem' }}>
                    <ul className="flex gap-5" style={{ scrollSnapAlign: 'start' }}>
                    {cards.map((c) => {
                        const href = `/athletes/${c.id}`;
                        const subtitleParts = [
                            c.school_name
                                ? `${c.school_name}${c.school_state ? `, ${c.school_state}` : ""}`
                                : null,
                            c.class_year ? `Class of ${c.class_year}` : null,
                        ].filter(Boolean);
                        const accent = getStarTierAccent(c.star_rating ?? null);
                        const hasAccent = Boolean(accent);
                        const starRating = c.star_rating ?? 0;
                        const starLabel = starRating >= 3 && starRating <= 5
                            ? "★".repeat(starRating)
                            : starRating > 0
                                ? `${starRating}★`
                                : null;
                        const borderClass = accent?.borderClass ?? "border-app";
                        const cardShadowClass = accent?.cardShadowClass ?? "";
                        const ribbonBgClass = accent?.ribbonBgClass ?? "bg-[#F5C518]";
                        const ribbonTextClass = accent?.ribbonTextClass ?? "text-[#111827]";
                        const textAccentClass = accent?.textAccentClass ?? "text-scarlet";

                        return (
                            <li key={c.id} className="w-[300px] shrink-0" style={{ scrollSnapAlign: 'start' }}>
                                <SafeLink
                                    href={href}
                                    className={`group relative block h-full overflow-hidden rounded-3xl border ${borderClass} bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${cardShadowClass}`}
                                >
                                    {hasAccent ? (
                                        <div
                                            className={`pointer-events-none absolute -left-24 top-8 z-20 w-64 -rotate-45 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.6em] shadow-lg ${ribbonBgClass} ${ribbonTextClass}`}
                                        >
                                            Certified
                                        </div>
                                    ) : null}
                                    <div className="relative flex h-40 w-full items-end overflow-hidden">
                                        {c.profile_pic_url ? (
                                            <ImageWithFallback
                                                src={c.profile_pic_url}
                                                alt={c.full_name || c.username || "Athlete"}
                                                fill
                                                sizes="320px"
                                                className="object-cover transition duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-gray-800 to-gray-900">
                                                <Image src="/runner-default.png" alt="" width={120} height={120} className="opacity-20" unoptimized />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                                        <div className="relative w-full px-5 pb-5" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.8)' }}>
                                            <p className="text-xs uppercase tracking-[0.35em] text-white/90">
                                                Featured slider
                                            </p>
                                            <h3 className="truncate text-lg font-semibold text-white">
                                                {c.full_name || c.username}
                                            </h3>
                                            {subtitleParts.length > 0 ? (
                                                <p className="truncate text-xs text-white/90">{subtitleParts.join(" • ")}</p>
                                            ) : null}
                                            {starLabel ? (
                                                <p
                                                    className={`mt-1 text-base font-bold tracking-wider ${textAccentClass === 'text-scarlet' ? 'text-scarlet-300' : 'text-yellow-300'}`}
                                                >
                                                    {starLabel}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="px-5 py-4">
                                        {c.blurb && (
                                            <p className="mb-3 text-sm text-muted line-clamp-2">{c.blurb}</p>
                                        )}
                                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-scarlet transition group-hover:text-scarlet/80">
                                            View profile →
                                        </span>
                                    </div>
                                </SafeLink>
                            </li>
                        );
                    })}
                    </ul>
                </div>
            </div>
        </section>
    );
}

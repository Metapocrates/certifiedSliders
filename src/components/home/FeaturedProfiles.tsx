// src/components/home/FeaturedProfiles.tsx
import Image from "next/image";
import SafeLink from "@/components/SafeLink";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getStarTierAccent } from "@/lib/star-theme";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProfileCard = {
    id: string;
    username: string | null;
    full_name: string | null;
    star_rating: number | null;
    class_year: number | null;
    school_name: string | null;
    school_state: string | null;
    profile_pic_url: string | null;
};

export default async function FeaturedProfiles({
    limit = 10,
}: {
    limit?: number;
}) {
    const supabase = await createSupabaseServer();

    // Step 1: Get manually featured athletes (featured=true, 3-5 stars)
    const { data: manuallyFeatured } = await supabase
        .from("profiles")
        .select(
            "id, username, full_name, star_rating, class_year, school_name, school_state, profile_pic_url"
        )
        .eq("featured", true)
        .not("profile_pic_url", "is", null)
        .gte("star_rating", 3)
        .lte("star_rating", 5)
        .order("star_rating", { ascending: false, nullsFirst: false });

    const manualCount = manuallyFeatured?.length ?? 0;
    const remainingSlots = Math.max(0, limit - manualCount);

    let rows: ProfileCard[] = [...(manuallyFeatured ?? [])];

    // Step 2: If we need more, get random athletes from 3-5 star pool
    if (remainingSlots > 0) {
        const manualIds = (manuallyFeatured ?? []).map((p) => p.id);

        // Get a pool of candidates and shuffle client-side (simpler than RPC)
        const { data: candidatePool } = await supabase
            .from("profiles")
            .select(
                "id, username, full_name, star_rating, class_year, school_name, school_state, profile_pic_url"
            )
            .or("featured.is.null,featured.eq.false")
            .not("profile_pic_url", "is", null)
            .gte("star_rating", 3)
            .lte("star_rating", 5)
            .limit(50); // Get a pool to randomize from

        if (candidatePool && candidatePool.length > 0) {
            // Filter out manually featured IDs
            const filtered = candidatePool.filter(p => !manualIds.includes(p.id));

            // Shuffle array using Fisher-Yates algorithm
            const shuffled = [...filtered];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            // Take only what we need
            rows.push(...shuffled.slice(0, remainingSlots));
        }
    }

    rows = rows as ProfileCard[];

    if (!rows.length) {
        return (
            <div className="rounded-xl border p-4 text-sm text-gray-600">
                No featured athletes yet.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {rows.map((p) => {
                const href = `/athletes/${p.id}`;
                const accent = getStarTierAccent(p.star_rating ?? null);
                const hasAccent = Boolean(accent);
                const starRating = p.star_rating ?? 0;
                const starText = starRating >= 3 && starRating <= 5
                    ? "★".repeat(starRating)
                    : starRating > 0
                        ? `${starRating}★`
                        : "Unrated";
                const borderClass = accent?.borderClass ?? "border-app";
                const cardShadowClass = accent?.cardShadowClass ?? "";
                const ribbonBgClass = accent?.ribbonBgClass ?? "bg-[#F5C518]";
                const ribbonTextClass = accent?.ribbonTextClass ?? "text-[#111827]";
                const starTextClass = accent?.textAccentClass ?? "text-scarlet";
                return (
                    <SafeLink
                        key={p.id}
                        href={href}
                        className={`group relative block h-48 overflow-hidden rounded-2xl border ${borderClass} shadow-lg transition hover:-translate-y-1 hover:shadow-xl ${cardShadowClass}`}
                        fallback={
                            <div className="relative block overflow-hidden rounded-2xl border border-app bg-card p-3 shadow-sm">
                                <div className="relative mb-2 h-32 w-full overflow-hidden rounded-xl bg-gray-100" />
                                <div className="text-sm font-semibold text-app">{p.full_name ?? "—"}</div>
                                <div className="text-xs text-muted">{p.school_name ?? "—"}</div>
                            </div>
                        }
                    >
                        {hasAccent ? (
                            <div
                                className={`pointer-events-none absolute -left-20 top-6 z-10 w-56 -rotate-45 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.55em] shadow-lg ${ribbonBgClass} ${ribbonTextClass}`}
                            >
                                Certified
                            </div>
                        ) : null}
                        {/* Full background image */}
                        <div className="absolute inset-0">
                            {p.profile_pic_url ? (
                                <Image
                                    src={p.profile_pic_url}
                                    alt={p.full_name ?? p.username ?? "Athlete"}
                                    fill
                                    sizes="(max-width:768px) 50vw, 20vw"
                                    className="object-cover transition duration-500 group-hover:scale-105"
                                    unoptimized
                                />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                                    <Image
                                        src="/runner-default.png"
                                        alt=""
                                        width={80}
                                        height={80}
                                        className="opacity-20"
                                        unoptimized
                                    />
                                </div>
                            )}
                            {/* Gradient overlay for text readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        </div>
                        {/* Text content overlay */}
                        <div className="relative flex h-full flex-col justify-end p-4 text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.8)' }}>
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-white/90">
                                    Featured Slider
                                </p>
                                <h3 className="text-sm font-bold line-clamp-1">
                                    {p.full_name ?? p.username ?? "—"}
                                </h3>
                                <p className="text-xs text-white/90 line-clamp-2">
                                    {p.school_name ? (
                                        <>
                                            {p.school_name}
                                            {p.school_state ? `, ${p.school_state}` : ""}
                                        </>
                                    ) : (
                                        "—"
                                    )}
                                    {p.class_year ? ` • Class of ${p.class_year}` : ""}
                                </p>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-base font-bold tracking-wider">
                                <span className={`${starTextClass === 'text-scarlet' ? 'text-scarlet-300' : 'text-yellow-300'}`}>
                                    {starText}
                                </span>
                            </div>
                        </div>
                    </SafeLink>
                );
            })}
        </div>
    );
}

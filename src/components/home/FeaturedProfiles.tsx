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
    limit = 6,
}: {
    limit?: number;
}) {
    const supabase = createSupabaseServer();

    // Pick standout athletes: 3★+ with avatar, recent first, then highest stars.
    const { data } = await supabase
        .from("profiles")
        .select(
            "id, username, full_name, star_rating, class_year, school_name, school_state, profile_pic_url"
        )
        .not("profile_pic_url", "is", null)
        .gte("star_rating", 3)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("star_rating", { ascending: false, nullsFirst: false })
        .limit(limit);

    const rows: ProfileCard[] = (data ?? []) as ProfileCard[];

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
                const href = p.username ? `/athletes/${p.username}` : undefined;
                const accent = getStarTierAccent(p.star_rating ?? null);
                const hasAccent = Boolean(accent);
                const starText = accent
                    ? `${accent.tier}★ Certified`
                    : typeof p.star_rating === "number"
                        ? `${p.star_rating}★`
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
                        className={`group relative block overflow-hidden rounded-2xl border ${borderClass} bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${cardShadowClass}`}
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
                        <div className="relative h-32 w-full overflow-hidden rounded-xl bg-gray-100">
                            {p.profile_pic_url ? (
                                <Image
                                    src={p.profile_pic_url}
                                    alt={p.full_name ?? p.username ?? "Athlete"}
                                    fill
                                    sizes="(max-width:768px) 50vw, 20vw"
                                    className="object-cover transition duration-500 group-hover:scale-105"
                                />
                            ) : (
                                <Image
                                    src="/favicon-64x64.png"
                                    alt=""
                                    fill
                                    sizes="(max-width:768px) 50vw, 20vw"
                                    className="object-contain p-4"
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-black/10 to-transparent opacity-90 transition group-hover:opacity-100" />
                        </div>
                        <div className="space-y-2 px-3 pb-4 pt-3">
                            <div className="text-xs uppercase tracking-[0.35em] text-muted">
                                Featured slider
                            </div>
                            <div className="text-sm font-semibold text-app line-clamp-1">
                                {p.full_name ?? p.username ?? "—"}
                            </div>
                            <div className="text-xs text-muted line-clamp-2">
                                {p.school_name ? (
                                    <>
                                        {p.school_name}
                                        {p.school_state ? `, ${p.school_state}` : ""}
                                    </>
                                ) : (
                                    "—"
                                )}
                                {p.class_year ? ` • Class of ${p.class_year}` : ""}
                            </div>
                            <div className={`text-xs font-semibold uppercase tracking-[0.3em] ${starTextClass}`}>
                                {starText}
                            </div>
                        </div>
                    </SafeLink>
                );
            })}
            </div>
    );
}

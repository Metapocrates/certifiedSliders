// src/components/home/FeaturedProfiles.tsx
import Image from "next/image";
import SafeLink from "@/components/SafeLink";
import { createSupabaseServer } from "@/lib/supabase/compat";

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
                return (
                    <SafeLink
                        key={p.id}
                        href={href}
                        className="group block overflow-hidden rounded-xl border bg-card hover:shadow-sm transition"
                        fallback={
                            <div className="block overflow-hidden rounded-xl border bg-card p-3">
                                <div className="relative mb-2 h-24 w-full overflow-hidden rounded-lg bg-gray-100" />
                                <div className="text-sm font-medium">{p.full_name ?? "—"}</div>
                                <div className="text-xs text-gray-500">
                                    {p.school_name ?? "—"}
                                </div>
                            </div>
                        }
                    >
                        <div className="relative mb-2 h-24 w-full overflow-hidden rounded-lg bg-gray-100">
                            {p.profile_pic_url ? (
                                <Image
                                    src={p.profile_pic_url}
                                    alt={p.full_name ?? p.username ?? "Athlete"}
                                    fill
                                    sizes="(max-width:768px) 50vw, 20vw"
                                    className="object-cover"
                                />
                            ) : (
                                <div className="grid h-full w-full place-items-center text-xl">
                                    🙂
                                </div>
                            )}
                        </div>
                        <div className="px-3 pb-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-medium truncate">
                                    {p.full_name ?? p.username ?? "—"}
                                </div>
                                <span className="shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] text-neutral-700">
                                    {p.star_rating ? `${p.star_rating}★` : "—"}
                                </span>
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                                {p.school_name ? (
                                    <>
                                        {p.school_name}
                                        {p.school_state ? `, ${p.school_state}` : ""}
                                    </>
                                ) : (
                                    "—"
                                )}
                                {p.class_year ? ` • ${p.class_year}` : ""}
                            </div>
                        </div>
                    </SafeLink>
                );
            })}
        </div>
    );
}
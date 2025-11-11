// src/app/rated-athletes/page.tsx
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServer } from "@/lib/supabase/compat";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RatedAthlete = {
  id: string;
  profile_id: string | null;
  full_name: string | null;
  username: string;
  school_name: string | null;
  school_state: string | null;
  class_year: number | null;
  gender: string | null;
  profile_pic_url: string | null;
  star_rating: number | null;
};

export default async function RatedAthletesPage() {
  const supabase = createSupabaseServer();

  // Fetch athletes with star ratings 3-5
  const { data: athletes } = await supabase
    .from("profiles")
    .select("id, profile_id, full_name, username, school_name, school_state, class_year, gender, profile_pic_url, star_rating")
    .not("profile_id", "is", null)
    .eq("status", "active")
    .eq("user_type", "athlete")
    .in("star_rating", [3, 4, 5])
    .order("star_rating", { ascending: false })
    .order("full_name", { ascending: true })
    .limit(100);

  const ratedAthletes = (athletes ?? []) as RatedAthlete[];

  // Group by star rating
  const fiveStars = ratedAthletes.filter((a) => a.star_rating === 5);
  const fourStars = ratedAthletes.filter((a) => a.star_rating === 4);
  const threeStars = ratedAthletes.filter((a) => a.star_rating === 3);

  return (
    <main className="container mx-auto max-w-6xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Rated Athletes</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          High school track and field athletes with 3-5 star ratings based on their verified performances.
        </p>
      </div>

      {ratedAthletes.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No rated athletes found.</p>
        </div>
      )}

      {/* 5-Star Athletes */}
      {fiveStars.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold text-foreground">
            <span className="text-yellow-500">★★★★★</span>
            <span>5-Star Athletes</span>
            <span className="text-sm font-normal text-muted-foreground">({fiveStars.length})</span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fiveStars.map((athlete) => (
              <AthleteCard key={athlete.id} athlete={athlete} />
            ))}
          </div>
        </section>
      )}

      {/* 4-Star Athletes */}
      {fourStars.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold text-foreground">
            <span className="text-yellow-500">★★★★</span>
            <span>4-Star Athletes</span>
            <span className="text-sm font-normal text-muted-foreground">({fourStars.length})</span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fourStars.map((athlete) => (
              <AthleteCard key={athlete.id} athlete={athlete} />
            ))}
          </div>
        </section>
      )}

      {/* 3-Star Athletes */}
      {threeStars.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold text-foreground">
            <span className="text-yellow-500">★★★</span>
            <span>3-Star Athletes</span>
            <span className="text-sm font-normal text-muted-foreground">({threeStars.length})</span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {threeStars.map((athlete) => (
              <AthleteCard key={athlete.id} athlete={athlete} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function AthleteCard({ athlete }: { athlete: RatedAthlete }) {
  const href = `/athletes/${athlete.profile_id}`;
  const displayName = athlete.full_name || athlete.username || "Unknown";
  const location = [athlete.school_name, athlete.school_state].filter(Boolean).join(", ");

  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-primary hover:shadow-md dark:bg-card/50"
    >
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-muted">
          <Image
            src={athlete.profile_pic_url ?? "/avatar-placeholder.png"}
            alt={displayName}
            fill
            sizes="64px"
            className="object-cover"
            unoptimized
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-foreground group-hover:text-primary">
                {displayName}
              </h3>
              <p className="text-sm text-muted-foreground">@{athlete.username}</p>
            </div>
            {athlete.star_rating && (
              <div className="flex-shrink-0 text-yellow-500">
                {"★".repeat(athlete.star_rating)}
              </div>
            )}
          </div>

          {location && (
            <p className="mt-1 truncate text-xs text-muted-foreground">{location}</p>
          )}

          {athlete.class_year && (
            <p className="mt-1 text-xs text-muted-foreground">Class of {athlete.class_year}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

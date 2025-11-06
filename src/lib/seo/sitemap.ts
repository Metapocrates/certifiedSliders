import { createSupabaseServer } from "@/lib/supabase/compat";

export type SitemapEntry = {
  url: string;
  lastModified: Date;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

/**
 * Fetch athlete profiles for sitemap generation
 * Returns profile_id and updated_at for all profiles
 */
export async function getAthleteProfiles(limit = 50000, offset = 0): Promise<Array<{ profile_id: string; updated_at: string }>> {
  const supabase = createSupabaseServer();

  const { data, error } = await supabase
    .from("profiles")
    .select("profile_id, updated_at")
    .not("profile_id", "is", null)
    .order("profile_id")
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching athlete profiles for sitemap:", error);
    return [];
  }

  return data || [];
}

/**
 * Get total count of profiles for sitemap pagination
 */
export async function getAthleteCount(): Promise<number> {
  const supabase = createSupabaseServer();

  const { count, error } = await supabase
    .from("profiles")
    .select("profile_id", { count: "exact", head: true })
    .not("profile_id", "is", null);

  if (error) {
    console.error("Error counting athletes for sitemap:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Determine how many sitemap shards are needed
 * Max 40k URLs per shard to stay under 50k limit
 */
export async function getAthleteShardCount(): Promise<number> {
  const total = await getAthleteCount();
  const perShard = 40000;
  return Math.ceil(total / perShard);
}

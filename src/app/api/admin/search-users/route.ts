import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

/**
 * GET /api/admin/search-users
 *
 * Search for users by email or name for impersonation.
 * Only admins can use this endpoint.
 * Returns test accounts first, then regular users.
 */
export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServer();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin status
    const { data: adminData } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminData) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    // Get search query and optional user_type filter
    const url = new URL(req.url);
    const query = url.searchParams.get("q");
    const userTypeFilter = url.searchParams.get("user_type");

    // Either query or user_type must be provided
    if ((!query || query.trim().length < 2) && !userTypeFilter) {
      return NextResponse.json({ error: "Search query must be at least 2 characters, or provide user_type filter" }, { status: 400 });
    }

    // Build the query
    let profileQuery = supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        user_type,
        status
      `)
      .eq("status", "active");

    // Apply filters
    if (query && query.trim().length >= 2) {
      const searchTerm = `%${query.trim()}%`;
      profileQuery = profileQuery.or(`full_name.ilike.${searchTerm}`);
    }

    if (userTypeFilter) {
      profileQuery = profileQuery.eq("user_type", userTypeFilter);
    }

    // Search profiles by name or email
    // Include a virtual is_test_account field based on test program membership or profile flag
    const { data: profiles, error } = await profileQuery.limit(20);

    if (error) {
      throw error;
    }

    // Get user emails from auth.users via service role
    // Since we can't directly access auth.users, we'll use the profile data
    // and mark test accounts based on certain patterns

    // Check which users are test coaches (have is_test_coach flag in program_memberships)
    const userIds = profiles?.map((p) => p.id) || [];
    let testUserIds = new Set<string>();

    if (userIds.length > 0) {
      const { data: testCoaches } = await supabase
        .from("program_memberships")
        .select("user_id")
        .in("user_id", userIds)
        .eq("is_test_coach", true);

      if (testCoaches) {
        testCoaches.forEach((tc) => testUserIds.add(tc.user_id));
      }
    }

    // Format results
    const users = (profiles || []).map((profile) => ({
      id: profile.id,
      email: null, // We don't have access to auth.users email from here
      full_name: profile.full_name,
      user_type: profile.user_type,
      is_test_account: testUserIds.has(profile.id),
    }));

    // Sort test accounts first
    users.sort((a, b) => {
      if (a.is_test_account && !b.is_test_account) return -1;
      if (!a.is_test_account && b.is_test_account) return 1;
      return 0;
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}

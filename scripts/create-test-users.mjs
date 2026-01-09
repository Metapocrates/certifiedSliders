#!/usr/bin/env node
/**
 * Creates test users for each portal type for admin testing purposes
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const testUsers = [
  {
    email: "test-athlete@certifiedsliders.test",
    password: "TestUser123!",
    fullName: "Test Athlete",
    userType: "athlete",
  },
  {
    email: "test-ncaa-coach@certifiedsliders.test",
    password: "TestUser123!",
    fullName: "Test NCAA Coach",
    userType: "ncaa_coach",
  },
  {
    email: "test-hs-coach@certifiedsliders.test",
    password: "TestUser123!",
    fullName: "Test HS Coach",
    userType: "hs_coach",
  },
  {
    email: "test-parent@certifiedsliders.test",
    password: "TestUser123!",
    fullName: "Test Parent",
    userType: "parent",
  },
];

async function createTestUsers() {
  console.log("Creating test users for portal testing...\n");

  for (const user of testUsers) {
    console.log(`Processing: ${user.fullName} (${user.userType})`);

    // Check if user already exists
    const { data: existingProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, user_type")
      .eq("user_type", user.userType)
      .ilike("full_name", `%test%`)
      .limit(1);

    if (existingProfiles && existingProfiles.length > 0) {
      console.log(`  ✓ Already exists: ${existingProfiles[0].full_name} (${existingProfiles[0].id})\n`);
      continue;
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: user.fullName,
      },
    });

    if (authError) {
      // User might already exist in auth but not in profiles
      if (authError.message.includes("already been registered")) {
        console.log(`  ⚠ Auth user exists, checking profile...`);

        // Try to find by email in auth
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingAuthUser = users?.users?.find(u => u.email === user.email);

        if (existingAuthUser) {
          // Update or create profile
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
              id: existingAuthUser.id,
              full_name: user.fullName,
              user_type: user.userType,
              status: "active",
            });

          if (profileError) {
            console.log(`  ✗ Failed to create/update profile: ${profileError.message}\n`);
          } else {
            console.log(`  ✓ Profile updated for existing auth user\n`);
          }
        }
        continue;
      }

      console.log(`  ✗ Auth error: ${authError.message}\n`);
      continue;
    }

    if (!authData.user) {
      console.log(`  ✗ No user returned from auth\n`);
      continue;
    }

    // Create profile (without is_test_account if column doesn't exist)
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: authData.user.id,
        full_name: user.fullName,
        user_type: user.userType,
        status: "active",
      });

    if (profileError) {
      console.log(`  ✗ Profile error: ${profileError.message}\n`);
      continue;
    }

    console.log(`  ✓ Created: ${authData.user.id}\n`);
  }

  console.log("\n--- Summary ---");

  // List all test users (by name pattern since is_test_account may not exist)
  const { data: allTestUsers } = await supabase
    .from("profiles")
    .select("id, full_name, user_type, status")
    .ilike("full_name", "%test%")
    .order("user_type");

  if (allTestUsers && allTestUsers.length > 0) {
    console.log("\nTest users available for impersonation:");
    for (const u of allTestUsers) {
      console.log(`  - ${u.full_name} (${u.user_type}) - ${u.id}`);
    }
  } else {
    console.log("\nNo test users found.");
  }
}

createTestUsers().catch(console.error);

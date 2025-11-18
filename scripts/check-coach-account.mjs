#!/usr/bin/env node
/**
 * Check and fix coach account user_type
 * Usage: node scripts/check-coach-account.mjs <email>
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/check-coach-account.mjs <email>');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`Checking account for: ${email}\n`);

// Get user by email
const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
if (listError) {
  console.error('Error listing users:', listError);
  process.exit(1);
}

const user = users.find(u => u.email === email);
if (!user) {
  console.error(`❌ No user found with email: ${email}`);
  process.exit(1);
}

console.log(`✅ Found user: ${user.id}`);
console.log(`   Email: ${user.email}`);
console.log(`   Provider: ${user.app_metadata.provider || 'email'}\n`);

// Check profile
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('id, full_name, user_type')
  .eq('id', user.id)
  .maybeSingle();

if (profileError) {
  console.error('Error fetching profile:', profileError);
  process.exit(1);
}

if (!profile) {
  console.error(`❌ No profile found for user ${user.id}`);
  process.exit(1);
}

console.log(`Profile:`);
console.log(`   ID: ${profile.id}`);
console.log(`   Name: ${profile.full_name || '(not set)'}`);
console.log(`   User Type: ${profile.user_type || '(not set)'}\n`);

// Check program memberships
const { data: memberships, error: membershipsError } = await supabase
  .from('program_memberships')
  .select('id, program_id, role, programs(name)')
  .eq('user_id', user.id);

if (membershipsError) {
  console.error('Error fetching memberships:', membershipsError);
  process.exit(1);
}

if (!memberships || memberships.length === 0) {
  console.log(`❌ No program memberships found`);
  console.log(`   This user has not completed coach onboarding\n`);
} else {
  console.log(`✅ Program memberships: ${memberships.length}`);
  memberships.forEach(m => {
    console.log(`   - ${m.programs?.name || m.program_id} (${m.role})`);
  });
  console.log();
}

// Fix if needed
if (memberships && memberships.length > 0 && profile.user_type !== 'ncaa_coach') {
  console.log(`🔧 Fixing user_type...`);
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ user_type: 'ncaa_coach' })
    .eq('id', user.id);

  if (updateError) {
    console.error('❌ Error updating profile:', updateError);
    process.exit(1);
  }

  console.log(`✅ Updated user_type to 'ncaa_coach'\n`);
  console.log(`Next steps:`);
  console.log(`1. Sign out on the live site`);
  console.log(`2. Sign in again with Google (or email/password)`);
  console.log(`3. You should be redirected to /coach/portal\n`);
} else if (profile.user_type === 'ncaa_coach') {
  console.log(`✅ User type is already set to 'ncaa_coach'`);
  console.log(`   If you're still seeing the athlete UI, try:`);
  console.log(`   1. Sign out completely`);
  console.log(`   2. Clear browser cache/cookies`);
  console.log(`   3. Sign in again\n`);
} else {
  console.log(`ℹ️  User has no program memberships and user_type is ${profile.user_type || 'not set'}`);
  console.log(`   Complete coach onboarding at /coach/onboarding to set up this account\n`);
}

#!/usr/bin/env node
/**
 * Set user_type for a user while preserving their other roles
 * Usage: node scripts/set-user-type.mjs <user_id> <user_type>
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const userId = process.argv[2];
const userType = process.argv[3];

if (!userId || !userType) {
  // If no args, list admins with auth emails
  console.log('Usage: node scripts/set-user-type.mjs <user_id> <user_type>');
  console.log('\nListing current admins...\n');

  const { data: admins, error } = await supabase
    .from('admins')
    .select('user_id, profiles(full_name, user_type)');

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  for (const admin of admins) {
    const profile = admin.profiles;

    // Get email from auth
    const { data: authUser } = await supabase.auth.admin.getUserById(admin.user_id);
    const email = authUser?.user?.email || 'no email';

    console.log(`- ${email}`);
    console.log(`  name: ${profile?.full_name || 'no name'}`);
    console.log(`  user_type: ${profile?.user_type || 'not set'}`);
    console.log(`  user_id: ${admin.user_id}`);
    console.log('');
  }
  process.exit(0);
}

// Get profile by user_id
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('id, full_name, user_type')
  .eq('id', userId)
  .maybeSingle();

if (profileError) {
  console.error('Error finding profile:', profileError.message);
  process.exit(1);
}

if (!profile) {
  console.error(`No profile found for user_id: ${userId}`);
  process.exit(1);
}

console.log(`Found user: ${profile.full_name}`);
console.log(`Current user_type: ${profile.user_type || 'not set'}`);

// Check if they're an admin
const { data: adminRecord } = await supabase
  .from('admins')
  .select('id')
  .eq('user_id', profile.id)
  .maybeSingle();

if (adminRecord) {
  console.log('User is an admin (will retain admin access)');
}

// Update user_type
const { error: updateError } = await supabase
  .from('profiles')
  .update({ user_type: userType })
  .eq('id', profile.id);

if (updateError) {
  console.error('Error updating profile:', updateError.message);
  process.exit(1);
}

console.log(`\nUpdated user_type to: ${userType}`);
console.log('Admin status: preserved (separate table)');

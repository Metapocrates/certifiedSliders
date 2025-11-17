#!/usr/bin/env node
/**
 * Create profile for existing auth user
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const userId = process.argv[2];
const userType = process.argv[3] || 'athlete';

if (!userId) {
  console.error('Usage: node scripts/create-profile-for-user.mjs <user-id> [user-type]');
  console.error('  user-type: athlete (default), ncaa_coach, hs_coach, parent');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`Creating profile for user: ${userId}`);
console.log(`User type: ${userType}\n`);

// Create profile
const { data, error } = await supabase
  .from('profiles')
  .insert({
    id: userId,
    full_name: null,
    username: null,
    user_type: userType,
  })
  .select()
  .single();

if (error) {
  if (error.code === '23505') {
    console.log('✅ Profile already exists');
  } else {
    console.error('❌ Error creating profile:', error);
    process.exit(1);
  }
} else {
  console.log('✅ Profile created successfully');
  console.log(data);
}

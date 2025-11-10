#!/usr/bin/env node
/**
 * scripts/env-check.cjs
 *
 * Verifies required environment variables are set in .env.local
 * Run: npm run env:check
 */

require('dotenv').config({ path: '.env.local' });

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
];

const OPTIONAL_VARS = [
  'NEXT_PUBLIC_APP_URL',
  'NODE_ENV',
];

console.log('🔍 Checking environment variables...\n');

let hasErrors = false;

// Check required variables
console.log('Required variables:');
REQUIRED_VARS.forEach((varName) => {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    console.log(`  ❌ ${varName} - MISSING`);
    hasErrors = true;
  } else {
    // Show truncated value for security
    const preview = value.length > 20
      ? `${value.substring(0, 20)}...`
      : value;
    console.log(`  ✅ ${varName} - Set (${value.length} chars)`);
  }
});

// Check optional variables
console.log('\nOptional variables:');
OPTIONAL_VARS.forEach((varName) => {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    console.log(`  ⚠️  ${varName} - Not set (optional)`);
  } else {
    console.log(`  ✅ ${varName} - Set: ${value}`);
  }
});

console.log('');

if (hasErrors) {
  console.log('❌ Environment check FAILED - missing required variables\n');
  console.log('Create or update .env.local with the missing variables.');
  console.log('See .env.example for reference.\n');
  process.exit(1);
} else {
  console.log('✅ Environment check PASSED - all required variables are set\n');
  process.exit(0);
}

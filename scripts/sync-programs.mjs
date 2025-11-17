#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Syncing programs from ncaa_track_programs...');

// First, check current count
const { count: currentCount } = await supabase
  .from('programs')
  .select('*', { count: 'exact', head: true });

console.log(`Current programs count: ${currentCount}`);

// Run the sync query - fetch all track & field related programs
const { data: ncaaPrograms, error: fetchError } = await supabase
  .from('ncaa_track_programs')
  .select('school_name, school_short_name, division, sport')
  .in('sport', ['Indoor Track & Field', 'Outdoor Track & Field', 'Cross Country'])
  .not('school_name', 'is', null);

if (fetchError) {
  console.error('Error fetching NCAA programs:', fetchError);
  process.exit(1);
}

console.log(`Found ${ncaaPrograms.length} NCAA program records`);

// Group by school name to get unique schools
const uniqueSchools = {};
for (const prog of ncaaPrograms) {
  if (!uniqueSchools[prog.school_name]) {
    uniqueSchools[prog.school_name] = {
      name: `${prog.school_name} Track & Field`,
      short_name: prog.school_short_name,
      division: prog.division,
      sport: 'Track & Field',
      is_active: true,
    };
  }
}

const programsToInsert = Object.values(uniqueSchools);
console.log(`Unique schools to insert: ${programsToInsert.length}`);

// Insert programs in batches to avoid timeout
const batchSize = 100;
let inserted = 0;
let skipped = 0;

for (let i = 0; i < programsToInsert.length; i += batchSize) {
  const batch = programsToInsert.slice(i, i + batchSize);

  const { data, error } = await supabase
    .from('programs')
    .upsert(batch, {
      onConflict: 'name',
      ignoreDuplicates: false
    })
    .select();

  if (error) {
    console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    if (error.code === '23505') {
      // Unique constraint violation - expected for duplicates
      skipped += batch.length;
    }
  } else {
    inserted += data?.length || 0;
  }

  console.log(`Progress: ${Math.min(i + batchSize, programsToInsert.length)}/${programsToInsert.length}`);
}

// Check final count
const { count: finalCount } = await supabase
  .from('programs')
  .select('*', { count: 'exact', head: true });

console.log(`\nSync complete!`);
console.log(`- Started with: ${currentCount} programs`);
console.log(`- Attempted to insert: ${programsToInsert.length} programs`);
console.log(`- Successfully inserted: ${inserted} programs`);
console.log(`- Skipped (duplicates): ${skipped} programs`);
console.log(`- Final count: ${finalCount} programs`);

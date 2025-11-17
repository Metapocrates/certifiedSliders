#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Fetching ncaa_track_programs data...');

const { data, error } = await supabase
  .from('ncaa_track_programs')
  .select('*')
  .order('school_name');

if (error) {
  console.error('Error fetching data:', error);
  process.exit(1);
}

if (!data || data.length === 0) {
  console.log('No data found in ncaa_track_programs table');
  process.exit(0);
}

console.log(`Found ${data.length} records`);

// Generate SQL INSERT statements
const sqlLines = [
  '-- ============================================',
  '-- SEED DATA: NCAA TRACK & FIELD PROGRAMS',
  `-- Generated: ${new Date().toISOString()}`,
  `-- Records: ${data.length}`,
  '-- ============================================',
  '',
  '-- Insert NCAA track programs',
];

for (const row of data) {
  const values = [
    row.id ? `'${row.id}'` : 'gen_random_uuid()',
    row.school_name ? `'${row.school_name.replace(/'/g, "''")}'` : 'NULL',
    row.school_short_name ? `'${row.school_short_name.replace(/'/g, "''")}'` : 'NULL',
    row.division ? `'${row.division.replace(/'/g, "''")}'` : 'NULL',
    row.conference ? `'${row.conference.replace(/'/g, "''")}'` : 'NULL',
    row.sport ? `'${row.sport.replace(/'/g, "''")}'` : 'NULL',
    row.gender ? `'${row.gender}'` : 'NULL',
    row.data_year || 'NULL',
    row.source ? `'${row.source.replace(/'/g, "''")}'` : "'NCAA Sponsorship XLSX'",
    row.created_at ? `'${row.created_at}'::timestamptz` : 'now()',
  ];

  sqlLines.push(
    `INSERT INTO public.ncaa_track_programs (id, school_name, school_short_name, division, conference, sport, gender, data_year, source, created_at)`
  );
  sqlLines.push(`VALUES (${values.join(', ')});`);
  sqlLines.push('');
}

sqlLines.push('-- Finished inserting NCAA programs');

const outputFile = 'supabase/migrations/20251117000000_seed_ncaa_programs.sql';
fs.writeFileSync(outputFile, sqlLines.join('\n'));

console.log(`Successfully wrote ${data.length} records to ${outputFile}`);

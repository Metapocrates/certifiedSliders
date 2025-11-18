#!/usr/bin/env node
/**
 * Import NCAA Track & Field programs from JSON or CSV file
 * Usage: node scripts/import-ncaa-programs.mjs <file-path>
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node scripts/import-ncaa-programs.mjs <file-path>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`Reading file: ${filePath}\n`);

// Read and parse file
const fileContent = fs.readFileSync(filePath, 'utf-8');
const ext = path.extname(filePath).toLowerCase();

let records = [];

if (ext === '.json') {
  records = JSON.parse(fileContent);
} else if (ext === '.csv') {
  // Simple CSV parser (assumes first row is headers)
  const lines = fileContent.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = lines[i].split(',');
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx]?.trim();
    });
    records.push(record);
  }
} else {
  console.error('Unsupported file format. Use .json or .csv');
  process.exit(1);
}

console.log(`Found ${records.length} records\n`);

// Show summary by division
const divisionCounts = {};
records.forEach(r => {
  const div = r.division || 'Unknown';
  divisionCounts[div] = (divisionCounts[div] || 0) + 1;
});

console.log('Division breakdown:');
Object.entries(divisionCounts).sort().forEach(([div, count]) => {
  console.log(`  ${div}: ${count}`);
});

console.log('\nClear existing data? [y/N]');
const readline = await import('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const answer = await new Promise(resolve => {
  rl.question('', resolve);
});
rl.close();

if (answer.toLowerCase() === 'y') {
  console.log('\nClearing ncaa_track_programs table...');
  const { error: deleteError } = await supabase
    .from('ncaa_track_programs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.error('Error clearing table:', deleteError);
    process.exit(1);
  }
  console.log('✅ Table cleared');
}

// Insert records in batches of 100
console.log('\nInserting records...');
const batchSize = 100;
let inserted = 0;
let errors = 0;

for (let i = 0; i < records.length; i += batchSize) {
  const batch = records.slice(i, i + batchSize);

  // Map to database schema
  const dbRecords = batch.map(r => ({
    school_name: r.school_name,
    school_short_name: r.school_short_name || null,
    division: r.division,
    conference: r.conference || null,
    sport: r.sport,
    gender: r.gender,
    data_year: r.data_year ? parseInt(r.data_year) : null,
    source: r.source || 'NCAA Sponsorship XLSX',
  }));

  const { error } = await supabase
    .from('ncaa_track_programs')
    .insert(dbRecords);

  if (error) {
    console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
    errors += batch.length;
  } else {
    inserted += batch.length;
  }

  if ((i + batchSize) % 500 === 0) {
    console.log(`Progress: ${Math.min(i + batchSize, records.length)}/${records.length}`);
  }
}

console.log(`\n✅ Import complete!`);
console.log(`   Inserted: ${inserted}`);
console.log(`   Errors: ${errors}`);
console.log(`   Total: ${records.length}`);

console.log('\nNext step: Run sync-programs.mjs to update programs table');

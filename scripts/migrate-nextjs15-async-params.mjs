#!/usr/bin/env node
/**
 * CRITICAL SECURITY FIX: CVE-2025-55182
 * Auto-migrate Next.js 14 → 15 async params/searchParams
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const files = await glob('src/app/**/page.tsx', { ignore: 'node_modules/**' });
const apiFiles = await glob('src/app/api/**/route.ts', { ignore: 'node_modules/**' });
const sitemapFiles = await glob('src/app/sitemaps/**/route.ts', { ignore: 'node_modules/**' });
const imageFiles = await glob('src/app/**/opengraph-image/**/route.tsx', { ignore: 'node_modules/**' });
const claimFiles = await glob('src/app/claim/**/page.tsx', { ignore: 'node_modules/**' });

const allFiles = [...files, ...apiFiles, ...sitemapFiles, ...imageFiles, ...claimFiles];

console.log(`Found ${allFiles.length} files to process`);

for (const file of allFiles) {
  let content = readFileSync(file, 'utf-8');
  let modified = false;

  // Fix params type signatures
  if (content.includes('{ params }') && !content.includes('Promise<{')) {
    // Pattern 1: { params }: { params: { id: string } }
    content = content.replace(
      /\{\s*params\s*\}:\s*\{\s*params:\s*\{([^}]+)\}\s*\}/g,
      '{ params }: { params: Promise<{$1}> }'
    );
    modified = true;
  }

  // Fix searchParams type signatures
  if (content.includes('searchParams') && !content.match(/searchParams\?*:\s*Promise/)) {
    content = content.replace(
      /searchParams\?*:\s*\{([^}]+)\}/g,
      'searchParams?: Promise<{$1}>'
    );
    modified = true;
  }

  // Add await params at function start if params is used
  if (modified && content.match(/export.*async function.*\{ params \}/)) {
    // Find the function and add await params
    content = content.replace(
      /(export.*async function[^{]+\{)\s*\n/,
      '$1\n  const resolvedParams = await params;\n'
    );

    // Replace params. with resolvedParams.
    content = content.replace(/params\.(\w+)/g, 'resolvedParams.$1');
  }

  // Add await searchParams
  if (modified && content.match(/export.*async function.*searchParams/)) {
    content = content.replace(
      /(export.*async function[^{]+\{)\s*\n/,
      '$1\n  const resolvedSearchParams = await searchParams;\n'
    );

    // Replace searchParams usage (be careful not to replace the parameter name)
    content = content.replace(/(?<!await\s)searchParams\s*\|\|/g, 'resolvedSearchParams ||');
    content = content.replace(/const\s+\{\s*([^}]+)\}\s*=\s*searchParams(?!\?)/g, 'const { $1 } = resolvedSearchParams');
  }

  if (modified) {
    writeFileSync(file, content);
    console.log(`✓ Fixed: ${file}`);
  }
}

console.log('\nMigration complete! Please review the changes.');

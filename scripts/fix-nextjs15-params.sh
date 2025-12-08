#!/bin/bash
# Fix Next.js 15 async params/searchParams breaking changes

# This script updates all page.tsx and route.ts files to use async params and searchParams

echo "Fixing Next.js 15 async params/searchParams..."

# Note: This is a CRITICAL SECURITY FIX for CVE-2025-55182
# We're upgrading from Next.js 14.2.33 to 15.4.8

echo "⚠️  CRITICAL SECURITY PATCH: CVE-2025-55182"
echo "Upgrading Next.js 14 → 15 requires making params/searchParams async"
echo ""
echo "This script will help automate the migration, but manual review is required."
echo ""
echo "Files that need updating:"
grep -r "{ params }\|{ searchParams }\|params:" src/app --include="*.tsx" --include="*.ts" | grep "page.tsx\|route.ts" | cut -d: -f1 | sort -u

echo ""
echo "Please update these files manually using the pattern:"
echo "  Old: { params }: { params: { id: string } }"
echo "  New: { params }: { params: Promise<{ id: string }> }"
echo "  Then await params at start of function: const p = await params;"

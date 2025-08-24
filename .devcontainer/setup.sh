#!/usr/bin/env bash
set -e

# Enable pnpm via corepack and pin a version
corepack enable
corepack prepare pnpm@8.15.4 --activate

# Install deps
pnpm install

# Helpful global tools (optional)
# npm i -g supabase@latest

echo "✅ Devcontainer setup complete. Run 'pnpm dev' to start Next.js."

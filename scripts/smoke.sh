#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"

pass() { printf "✅ %s\n" "$1"; }
fail() { printf "❌ %s\n" "$1"; exit 1; }

check() {
  local path="$1"
  local expect="$2" # e.g. 200 or 307
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$path")
  if [ "$code" = "$expect" ]; then
    pass "$code $path"
  else
    fail "Expected $expect but got $code for $path"
  fi
}

echo "Smoking: $BASE_URL"

# Public pages
check "/" 200
check "/rankings" 200
check "/athletes" 200
check "/robots.txt" 200
check "/sitemap.xml" 200

# Auth-gated redirects (should redirect when signed out)
check "/submit-result" 307
check "/me" 307
check "/admin" 307

echo "All good 👍"

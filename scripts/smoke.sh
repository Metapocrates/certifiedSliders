#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"

paths=(
  "/"
  "/rankings"
  "/athletes"
  "/login"
  "/submit-result"
  "/me"           # likely redirects to /login when signed out (302)
  "/admin"        # likely redirects to /login when signed out (302)
  "/robots.txt"
  "/sitemap.xml"
)

printf "Hitting %s\n" "$BASE_URL"
for p in "${paths[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$p")
  printf "%3s  %s\n" "$code" "$p"
done

// scripts/check-routes.js
// Finds potential duplicate routes by stripping parentheses groups from paths.
import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "src", "app");
const pages = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name === "page.tsx") {
      const rel = full.replace(ROOT, ""); // e.g., /(protected)/admin/results/page.tsx
      const segments = rel.split(path.sep).filter(Boolean);
      const logical = segments
        .slice(0, -1) // drop page.tsx
        .filter((s) => !(s.startsWith("(") && s.endsWith(")"))) // drop route groups
        .join("/");
      pages.push({ physical: rel, logical: `/${logical}` });
    }
  }
}

walk(ROOT);

const byLogical = new Map();
for (const p of pages) {
  if (!byLogical.has(p.logical)) byLogical.set(p.logical, []);
  byLogical.get(p.logical).push(p.physical);
}

let dup = 0;
for (const [logical, physicals] of byLogical.entries()) {
  if (physicals.length > 1) {
    dup++;
    console.log(`DUPLICATE ROUTE: ${logical}`);
    for (const ph of physicals) console.log(`  - ${ph}`);
  }
}

if (dup > 0) {
  process.exitCode = 1;
} else {
  console.log("No duplicate logical routes detected.");
}

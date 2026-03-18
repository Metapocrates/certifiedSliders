/**
 * SCA Recruiting — Source Adapter
 *
 * COMPLIANCE:
 * - Extracts ONLY factual fields: name, grad class, rank, event, school, state
 * - NO editorial text, descriptions, blurbs, or page structure
 * - Every field is validated against the allowlist before returning
 * - If a field looks editorial rather than factual, it is excluded
 */

import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { ParsedAthleteRecord, SourceAdapter } from "../types";
import { isEditorialContent } from "../compliance";

export const SCA_SOURCE_KEY = "sca_recruiting";

/**
 * SCA Recruiting adapter.
 *
 * This adapter parses public ranking pages from SCA Recruiting to extract
 * factual athlete identification data for discovery purposes only.
 * It does NOT recreate the ranking page or copy editorial content.
 */
export const scaRecruitingAdapter: SourceAdapter = {
  sourceKey: SCA_SOURCE_KEY,

  matchesUrl(url: string): boolean {
    try {
      const u = new URL(url);
      return (
        u.hostname.includes("scarecruitingranking") ||
        u.hostname.includes("scarecruiting")
      );
    } catch {
      return false;
    }
  },

  parse(html: string, url: string): ParsedAthleteRecord[] {
    const $ = cheerio.load(html);
    const records: ParsedAthleteRecord[] = [];

    // Strategy: Look for table rows or structured list items containing athlete data.
    // SCA pages typically list athletes in tables or card-like structures.
    // We try multiple selector strategies for robustness.

    // Strategy 1: Table-based rankings (most common)
    $("table tbody tr, table tr").each((_i, row) => {
      const record = parseTableRow($, row);
      if (record) records.push(record);
    });

    // Strategy 2: If no table rows found, try list/card structures
    if (records.length === 0) {
      $("[class*='ranking'], [class*='player'], [class*='athlete'], [class*='recruit']").each(
        (_i, el) => {
          const record = parseCardElement($, el);
          if (record) records.push(record);
        }
      );
    }

    // Strategy 3: Generic structured data extraction
    if (records.length === 0) {
      // Look for any repeated structure with names and numbers
      const record = parseGenericStructure($);
      records.push(...record);
    }

    return records;
  },
};

// ─── Internal Parsers ──────────────────────────────────────────────

function parseTableRow(
  $: cheerio.CheerioAPI,
  row: Element
): ParsedAthleteRecord | null {
  const cells = $(row).find("td, th");
  if (cells.length < 2) return null;

  // Extract text from all cells
  const cellTexts = cells
    .map((_i, cell) => $(cell).text().trim())
    .get()
    .filter((t) => t.length > 0);

  if (cellTexts.length < 2) return null;

  // Try to identify factual fields from cell content
  let athlete_name: string | null = null;
  let grad_class: number | null = null;
  let raw_rank: number | null = null;
  let event: string | null = null;
  let school: string | null = null;
  let state: string | null = null;

  for (const text of cellTexts) {
    // COMPLIANCE: Skip any cell that looks editorial
    if (isEditorialContent(text)) continue;

    // Rank: small integer at start, often first column
    if (!raw_rank && /^\d{1,4}$/.test(text) && Number(text) <= 5000) {
      raw_rank = Number(text);
      continue;
    }

    // Grad class: 4-digit year
    if (!grad_class && /^20[2-3]\d$/.test(text)) {
      grad_class = Number(text);
      continue;
    }

    // State: 2-letter code
    if (!state && /^[A-Z]{2}$/.test(text)) {
      state = text;
      continue;
    }

    // Event: common track & field event patterns
    if (!event && isTrackEvent(text)) {
      event = text;
      continue;
    }

    // Name: likely a name if 2-4 words, not a number, not an event
    if (
      !athlete_name &&
      text.length >= 3 &&
      text.length <= 60 &&
      /^[A-Za-z'. -]+$/.test(text) &&
      text.split(/\s+/).length >= 2
    ) {
      athlete_name = text;
      continue;
    }

    // School: multi-word text that isn't a name or event
    if (
      !school &&
      athlete_name &&
      text.length >= 3 &&
      text.length <= 80 &&
      !isTrackEvent(text) &&
      text.split(/\s+/).length >= 1
    ) {
      school = text;
      continue;
    }
  }

  if (!athlete_name) return null;

  return { athlete_name, grad_class, raw_rank, event, school, state };
}

function parseCardElement(
  $: cheerio.CheerioAPI,
  el: Element
): ParsedAthleteRecord | null {
  const text = $(el).text();

  // COMPLIANCE: Skip elements that are primarily editorial
  if (isEditorialContent(text)) return null;

  // Try to extract structured data from card-like element
  const nameEl = $(el).find(
    "[class*='name'], h2, h3, h4, a[href*='profile'], a[href*='player']"
  );
  const athlete_name = nameEl.first().text().trim();

  if (!athlete_name || athlete_name.length < 3) return null;
  if (isEditorialContent(athlete_name)) return null;

  // Extract other fields from surrounding text
  const fullText = $(el).text();
  const grad_class = extractGradClass(fullText);
  const state = extractState(fullText);
  const event = extractEvent(fullText);
  const raw_rank = extractRank($(el), $);

  // Try to find school
  const schoolEl = $(el).find("[class*='school'], [class*='team']");
  let school = schoolEl.first().text().trim() || null;
  if (school && isEditorialContent(school)) school = null;

  return { athlete_name, grad_class, raw_rank, event, school, state };
}

function parseGenericStructure(
  $: cheerio.CheerioAPI
): ParsedAthleteRecord[] {
  // Fallback: Look for repeated elements that look like athlete entries
  // This is intentionally conservative — better to miss data than ingest editorial
  const records: ParsedAthleteRecord[] = [];

  // Find elements that contain what looks like a name + class year pattern
  $("*")
    .filter(function () {
      const text = $(this).text().trim();
      // Must contain what looks like a name (2+ words, letters only)
      // and a grad class year
      return (
        text.length < 200 && // Not too long (would be editorial)
        /[A-Z][a-z]+ [A-Z][a-z]+/.test(text) && // Name-like pattern
        /20[2-3]\d/.test(text) && // Year-like pattern
        !isEditorialContent(text) // Not editorial
      );
    })
    .each((_i, el) => {
      // Only process leaf-ish elements (not containers of many athletes)
      const childCount = $(el).children().length;
      if (childCount > 10) return; // Too many children = container

      const text = $(el).text().trim();
      const nameMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z'.]+){1,3})/);
      const classMatch = text.match(/(20[2-3]\d)/);

      if (nameMatch) {
        records.push({
          athlete_name: nameMatch[1],
          grad_class: classMatch ? Number(classMatch[1]) : null,
          raw_rank: null,
          event: extractEvent(text),
          school: null,
          state: extractState(text),
        });
      }
    });

  return records;
}

// ─── Field Extraction Helpers ──────────────────────────────────────

function isTrackEvent(text: string): boolean {
  const eventPatterns = [
    /^\d{2,4}m?$/i, // 100, 200, 400, 800, 1500, 100m
    /^\d+(?:m|meter)\s*(?:hurdles?|h)?$/i, // 110m Hurdles
    /^(?:shot\s*put|discus|javelin|hammer|pole\s*vault|high\s*jump|long\s*jump|triple\s*jump)$/i,
    /^(?:4x\d+|4\s*x\s*\d+)(?:m?\s*relay)?$/i, // 4x100, 4x400 relay
    /^(?:mile|two\s*mile|5k|10k|xc|cross\s*country|steeple(?:chase)?)$/i,
    /^(?:decathlon|heptathlon|pentathlon)$/i,
    /^\d+(?:m|meter)\s*(?:dash|run|race)?$/i,
    /^(?:sp|dt|jt|hj|lj|tj|pv)$/i, // Abbreviations
  ];
  return eventPatterns.some((p) => p.test(text.trim()));
}

function extractGradClass(text: string): number | null {
  const match = text.match(/(?:class\s+of\s+|c\/o\s+|'?)?(20[2-3]\d)/i);
  return match ? Number(match[1]) : null;
}

function extractState(text: string): string | null {
  const match = text.match(/\b([A-Z]{2})\b/);
  // Validate it's a real US state code
  const states = new Set([
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
    "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
    "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
    "VA","WA","WV","WI","WY","DC",
  ]);
  return match && states.has(match[1]) ? match[1] : null;
}

function extractEvent(text: string): string | null {
  // Look for common track events in text
  const eventMatch = text.match(
    /\b(\d{2,4}m?\s*(?:hurdles?|h)?|shot\s*put|discus|javelin|pole\s*vault|high\s*jump|long\s*jump|triple\s*jump|4x\d+m?\s*relay?)\b/i
  );
  return eventMatch ? eventMatch[1].trim() : null;
}

function extractRank(
  el: cheerio.Cheerio<Element>,
  $: cheerio.CheerioAPI
): number | null {
  // Look for rank in a data attribute or class
  const rankAttr = el.attr("data-rank") || el.attr("data-position");
  if (rankAttr && /^\d+$/.test(rankAttr)) return Number(rankAttr);

  // Look for a rank number in a child element
  const rankEl = el.find("[class*='rank'], [class*='position'], [class*='number']");
  const rankText = rankEl.first().text().trim();
  if (/^\d{1,4}$/.test(rankText)) return Number(rankText);

  return null;
}

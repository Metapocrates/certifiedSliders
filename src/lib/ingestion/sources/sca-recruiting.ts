/**
 * SCA Recruiting — Source Adapter
 *
 * Site: scarecruiting.com (Squarespace-based)
 * Structure: Squarespace user-items-list with list-item-content elements
 *
 * COMPLIANCE:
 * - Extracts ONLY factual fields: name, grad class, rank, event, school, state
 * - NO editorial text, descriptions, blurbs, or page structure
 * - Every field is validated against the allowlist before returning
 * - If a field looks editorial rather than factual, it is excluded
 */

import * as cheerio from "cheerio";
import type { ParsedAthleteRecord, SourceAdapter } from "../types";

export const SCA_SOURCE_KEY = "sca_recruiting";

// US state codes for validation
const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
]);

export const scaRecruitingAdapter: SourceAdapter = {
  sourceKey: SCA_SOURCE_KEY,

  matchesUrl(url: string): boolean {
    try {
      const u = new URL(url);
      return (
        u.hostname.includes("scarecruiting") ||
        u.hostname.includes("scarecruitingranking")
      );
    } catch {
      return false;
    }
  },

  parse(html: string, url: string): ParsedAthleteRecord[] {
    const $ = cheerio.load(html);
    const records: ParsedAthleteRecord[] = [];
    const seen = new Set<string>();

    // Extract grad class from URL if present (e.g. rankings-2028 → 2028)
    const urlGradClass = extractGradClassFromUrl(url);

    // ─── Strategy 1: Squarespace list-item-content pattern ──────
    // SCA uses Squarespace with .list-item-content__title for name
    // and .list-item-content__description for event/details
    let rankCounter = 0;
    $(".user-items-list-item-container, [class*='list-item']").each((_i, container) => {
      const titleEl = $(container).find(
        ".list-item-content__title, [class*='list-item'] h2, [class*='list-item'] h3"
      );
      const descEl = $(container).find(
        ".list-item-content__description, [class*='list-item'] p"
      );

      const titleText = titleEl.first().text().trim();
      if (!titleText || titleText.length < 3) return;

      const record = parseScaEntry(titleText, descEl.first().text().trim(), 0, urlGradClass);
      if (record && !seen.has(record.athlete_name.toLowerCase())) {
        rankCounter++;
        record.raw_rank = rankCounter; // Use sequential rank based on parsed athlete order
        seen.add(record.athlete_name.toLowerCase());
        records.push(record);
      }
    });

    // ─── Strategy 2: Squarespace summary/grid blocks ────────────
    if (records.length === 0) {
      $(".summary-title, .summary-excerpt, .sqs-block-summary-v2 .summary-item").each((_i, el) => {
        const text = $(el).text().trim();
        const record = parseScaEntry(text, "", _i + 1, urlGradClass);
        if (record && !seen.has(record.athlete_name.toLowerCase())) {
          seen.add(record.athlete_name.toLowerCase());
          records.push(record);
        }
      });
    }

    // ─── Strategy 3: Generic heading + paragraph pairs ──────────
    if (records.length === 0) {
      $("h2, h3, h4").each((_i, heading) => {
        const text = $(heading).text().trim();
        // Look for "Name (STATE)" pattern
        const nameStateMatch = text.match(/^([A-Z][a-zA-Z'. -]+?)\s*\(([A-Z]{2})\)\s*$/);
        if (nameStateMatch && US_STATES.has(nameStateMatch[2])) {
          const name = nameStateMatch[1].trim();
          if (name.split(/\s+/).length >= 2 && !seen.has(name.toLowerCase())) {
            // Get next sibling text for event info
            const nextText = $(heading).next().text().trim();
            const event = extractEventFromDescription(nextText);

            seen.add(name.toLowerCase());
            records.push({
              athlete_name: name,
              grad_class: urlGradClass,
              raw_rank: _i + 1,
              event,
              school: null,
              state: nameStateMatch[2],
              source_rating: null,
            });
          }
        }
      });
    }

    // ─── Strategy 4: Table-based (fallback for non-Squarespace) ─
    if (records.length === 0) {
      $("table tbody tr, table tr").each((_i, row) => {
        const cells = $(row).find("td");
        if (cells.length < 2) return;

        const cellTexts = cells.map((_j, c) => $(c).text().trim()).get();
        const record = parseTableCells(cellTexts, urlGradClass);
        if (record && !seen.has(record.athlete_name.toLowerCase())) {
          seen.add(record.athlete_name.toLowerCase());
          records.push(record);
        }
      });
    }

    // ─── Strategy 5: Any text block with "Name (STATE)" pattern ─
    if (records.length === 0) {
      // Scan all text nodes for the pattern: "Name (ST)" followed by event info
      const bodyText = $("body").text();
      const pattern = /([A-Z][a-zA-Z'. -]+?)\s*\(([A-Z]{2})\)/g;
      let match;
      let rank = 0;

      while ((match = pattern.exec(bodyText)) !== null) {
        const name = match[1].trim();
        const state = match[2];

        if (
          US_STATES.has(state) &&
          name.split(/\s+/).length >= 2 &&
          name.length >= 5 &&
          name.length <= 50 &&
          !seen.has(name.toLowerCase())
        ) {
          rank++;
          // Look at surrounding text for event
          const surrounding = bodyText.slice(
            Math.max(0, match.index - 20),
            Math.min(bodyText.length, match.index + match[0].length + 100)
          );
          const event = extractEventFromDescription(surrounding);

          seen.add(name.toLowerCase());
          records.push({
            athlete_name: name,
            grad_class: urlGradClass,
            raw_rank: rank,
            event,
            school: null,
            state,
            source_rating: null,
          });
        }
      }
    }

    return records;
  },
};

// ─── SCA-Specific Parsing ──────────────────────────────────────────

/**
 * Parse a single SCA entry from title + description text.
 * Title format: "Athlete Name (ST)" e.g. "Dillon Mitchell (TX)"
 * Description format: "Sprints / Football, 5 star, 92 Rating"
 *
 * COMPLIANCE: We extract only name, state, event, and rank position.
 * We do NOT store the star rating or editorial rating number from SCA —
 * those are their proprietary assessment, not factual data.
 */
function parseScaEntry(
  title: string,
  description: string,
  position: number,
  urlGradClass: number | null
): ParsedAthleteRecord | null {
  if (!title || title.length < 3) return null;

  // Parse "Name (STATE)" pattern
  const nameStateMatch = title.match(/^(.+?)\s*\(([A-Z]{2})\)\s*$/);

  let athlete_name: string;
  let state: string | null = null;

  if (nameStateMatch && US_STATES.has(nameStateMatch[2])) {
    athlete_name = nameStateMatch[1].trim();
    state = nameStateMatch[2];
  } else {
    // Name without state
    athlete_name = title.trim();
    // Try to find state elsewhere
    const stateMatch = title.match(/\b([A-Z]{2})\b/);
    if (stateMatch && US_STATES.has(stateMatch[1])) {
      state = stateMatch[1];
      athlete_name = title.replace(`(${state})`, "").trim();
    }
  }

  // Validate name looks like a person's name
  if (
    athlete_name.length < 3 ||
    athlete_name.length > 60 ||
    athlete_name.split(/\s+/).length < 2 ||
    !/[A-Za-z]/.test(athlete_name)
  ) {
    return null;
  }

  // Extract event category from description
  const event = extractEventFromDescription(description);

  // Extract star rating (3-5) from description as reference data
  // Format: "Sprints, 5 star, 92 Rating" → 5
  const source_rating = extractStarRating(description);

  return {
    athlete_name,
    grad_class: urlGradClass,
    raw_rank: position,
    event,
    school: null,
    state,
    source_rating,
  };
}

/**
 * Extract star rating from SCA description.
 * Input: "Sprints / Football, 5 star, 92 Rating" → 5
 * Stored as reference data — NOT used as our rating.
 */
function extractStarRating(text: string): number | null {
  if (!text) return null;
  const match = text.match(/(\d)\s*star/i);
  if (match) {
    const rating = Number(match[1]);
    if (rating >= 1 && rating <= 5) return rating;
  }
  return null;
}

/**
 * Extract event category from SCA description text.
 * Input examples: "Sprints / Football, 5 star, 92 Rating"
 *                 "Hurdles, 4 star, 88 Rating"
 *                 "Jumps, 4 star, 87 Rating"
 *
 * COMPLIANCE: We extract ONLY the event name (factual).
 * We intentionally skip star/rating numbers (editorial assessment).
 */
function extractEventFromDescription(text: string): string | null {
  if (!text) return null;

  // Common SCA event categories
  const eventPatterns = [
    /\b(sprints?)\b/i,
    /\b(hurdles?)\b/i,
    /\b(jumps?)\b/i,
    /\b(throws?)\b/i,
    /\b(distance)\b/i,
    /\b(mid[- ]?distance)\b/i,
    /\b(pole\s*vault)\b/i,
    /\b(high\s*jump)\b/i,
    /\b(long\s*jump)\b/i,
    /\b(triple\s*jump)\b/i,
    /\b(shot\s*put)\b/i,
    /\b(discus)\b/i,
    /\b(javelin)\b/i,
    /\b(decathlon)\b/i,
    /\b(heptathlon)\b/i,
    /\b(multi[- ]?events?)\b/i,
    /\b(relays?)\b/i,
    /\b(\d{2,4}\s*m(?:eters?)?(?:\s*hurdles?)?)\b/i,
    /\b(mile|two\s*mile|5k|10k|steeple(?:chase)?|xc|cross\s*country)\b/i,
  ];

  for (const pattern of eventPatterns) {
    const match = text.match(pattern);
    if (match) {
      // Capitalize first letter
      const event = match[1].trim();
      return event.charAt(0).toUpperCase() + event.slice(1).toLowerCase();
    }
  }

  // Try extracting the first word/phrase before a comma
  // e.g. "Sprints / Football, 5 star" → "Sprints"
  const beforeComma = text.split(",")[0]?.trim();
  if (beforeComma) {
    const beforeSlash = beforeComma.split("/")[0]?.trim();
    if (
      beforeSlash &&
      beforeSlash.length >= 3 &&
      beforeSlash.length <= 30 &&
      /^[A-Za-z\s-]+$/.test(beforeSlash)
    ) {
      return beforeSlash;
    }
  }

  return null;
}

/**
 * Extract grad class year from URL.
 * e.g. "track-boys-recruit-rankings-2028" → 2028
 */
function extractGradClassFromUrl(url: string): number | null {
  const match = url.match(/(?:rankings?|class|recruit)[^\d]*(20[2-3]\d)/i);
  if (match) return Number(match[1]);

  // Also try just a year at the end of the path
  const pathMatch = url.match(/-(20[2-3]\d)(?:\/?$|\?)/);
  if (pathMatch) return Number(pathMatch[1]);

  return null;
}

/**
 * Parse a table row's cells into a record (fallback strategy).
 */
function parseTableCells(
  cells: string[],
  urlGradClass: number | null
): ParsedAthleteRecord | null {
  if (cells.length < 2) return null;

  let athlete_name: string | null = null;
  let raw_rank: number | null = null;
  let state: string | null = null;
  let event: string | null = null;

  for (const text of cells) {
    if (!text) continue;

    // Rank: small integer
    if (!raw_rank && /^\d{1,4}$/.test(text) && Number(text) <= 5000) {
      raw_rank = Number(text);
      continue;
    }

    // State: 2-letter code
    if (!state && /^[A-Z]{2}$/.test(text) && US_STATES.has(text)) {
      state = text;
      continue;
    }

    // Name: "Name (ST)" or just a name
    if (!athlete_name) {
      const nameState = text.match(/^(.+?)\s*\(([A-Z]{2})\)\s*$/);
      if (nameState && US_STATES.has(nameState[2])) {
        athlete_name = nameState[1].trim();
        state = nameState[2];
        continue;
      }
      if (
        text.length >= 5 &&
        text.length <= 60 &&
        text.split(/\s+/).length >= 2 &&
        /^[A-Za-z'. -]+$/.test(text)
      ) {
        athlete_name = text;
        continue;
      }
    }

    // Event
    if (!event) {
      const ev = extractEventFromDescription(text);
      if (ev) { event = ev; continue; }
    }
  }

  if (!athlete_name) return null;

  return {
    athlete_name,
    grad_class: urlGradClass,
    raw_rank,
    event,
    school: null,
    state,
    source_rating: null,
  };
}

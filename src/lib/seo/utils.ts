/**
 * SEO utility functions for Certified Sliders
 */

/**
 * Determine if a page should be indexed based on pagination and filters
 * @param searchParams - URL search parameters
 * @returns boolean - true if page should be indexed
 */
export function shouldIndex(searchParams: Record<string, any>): boolean {
  const page = Number(searchParams?.page || 1);
  const filterKeys = Object.keys(searchParams || {}).filter(
    (k) => k !== "page" && k !== "year" && k !== "event"
  );
  const facetCount = filterKeys.length;

  // Index first 3 pages with minimal filters
  return page <= 3 && facetCount <= 2;
}

/**
 * Generate canonical URL for a page
 * @param baseUrl - Base URL without query params
 * @param preserveParams - Params to preserve in canonical (e.g., year, event)
 * @returns canonical URL string
 */
export function getCanonicalUrl(
  baseUrl: string,
  preserveParams?: Record<string, string>
): string {
  if (!preserveParams || Object.keys(preserveParams).length === 0) {
    return baseUrl;
  }

  const params = new URLSearchParams(preserveParams);
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Format athlete name for meta tags
 */
export function formatAthleteMetaTitle(
  name: string,
  classYear?: number | null,
  primaryEvent?: string | null
): string {
  const parts = [name];

  if (classYear) {
    parts.push(`Class of ${classYear}`);
  }

  if (primaryEvent) {
    parts.push(primaryEvent);
  }

  parts.push("Certified Sliders");

  return parts.join(" | ");
}

/**
 * Format athlete description for meta tags
 */
export function formatAthleteMetaDescription(
  name: string,
  classYear?: number | null,
  school?: string | null,
  state?: string | null,
  primaryEvent?: string | null,
  starRating?: number | null
): string {
  const parts: string[] = [];

  if (starRating && starRating >= 3) {
    parts.push(`${starRating}-star verified profile for ${name}`);
  } else {
    parts.push(`Verified high school track & field profile for ${name}`);
  }

  if (classYear) {
    parts.push(`Class of ${classYear}`);
  }

  if (school) {
    if (state) {
      parts.push(`competing for ${school}, ${state}`);
    } else {
      parts.push(`competing for ${school}`);
    }
  }

  if (primaryEvent) {
    parts.push(`View PRs, rankings, and highlights for ${primaryEvent}`);
  }

  return parts.join(". ") + ".";
}

/**
 * Format rankings page title
 */
export function formatRankingsMetaTitle(
  year?: string,
  event?: string,
  gender?: string
): string {
  const parts: string[] = [];

  if (year) {
    parts.push(year);
  }

  if (event) {
    parts.push(event);
  } else {
    parts.push("Track & Field");
  }

  parts.push("Rankings");

  if (gender) {
    parts.push(gender === "M" ? "Boys" : "Girls");
  }

  parts.push("Certified Sliders");

  return parts.join(" | ");
}

/**
 * Format rankings page description
 */
export function formatRankingsMetaDescription(
  year?: string,
  event?: string,
  gender?: string
): string {
  const parts: string[] = ["Top verified high school track & field marks"];

  if (event) {
    parts.push(`for ${event}`);
  }

  if (year) {
    parts.push(`in ${year}`);
  }

  parts.push("Filter by class year, state, and event. All results admin-verified.");

  return parts.join(" ");
}

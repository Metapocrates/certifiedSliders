/**
 * Source Adapter Registry
 *
 * Maps source keys to their adapter implementations.
 * Each adapter is isolated and modular — add new sources by creating
 * a new file in this directory and registering it here.
 */

import type { SourceAdapter } from "../types";
import { scaRecruitingAdapter } from "./sca-recruiting";

const adapters: SourceAdapter[] = [
  scaRecruitingAdapter,
  // Add new source adapters here:
  // prepStarAdapter,
  // maxPrepsAdapter,
];

/**
 * Get adapter by source key.
 */
export function getAdapter(sourceKey: string): SourceAdapter | null {
  return adapters.find((a) => a.sourceKey === sourceKey) ?? null;
}

/**
 * Get adapter that matches a given URL.
 */
export function getAdapterForUrl(url: string): SourceAdapter | null {
  return adapters.find((a) => a.matchesUrl(url)) ?? null;
}

/**
 * List all registered source keys.
 */
export function listAdapterKeys(): string[] {
  return adapters.map((a) => a.sourceKey);
}

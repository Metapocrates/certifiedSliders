// src/lib/proofs/types.ts

// --- string unions (no runtime deps) ---
export type ProofSource = 'athleticnet' | 'milesplit' | 'direct';
export type ProofStatus = 'pending' | 'valid' | 'invalid';

// Full internal timing vocabulary (useful if you later normalize away null)
export type Timing = 'FAT' | 'hand' | 'auto' | 'unknown';

// If some code wants to iterate/validate without Zod:
export const PROOF_SOURCES = ['athleticnet', 'milesplit', 'direct'] as const;
export const PROOF_STATUSES = ['pending', 'valid', 'invalid'] as const;
export const TIMING_VALUES = ['FAT', 'hand', 'auto', 'unknown'] as const;

// --- parsed proof payload (keep exactly your field names) ---
export type ParsedProof = {
    event: string;               // e.g. "110H", "300H", "400m"
    markText: string;            // e.g. "14.76", "38.90", "4:12.35", "53.7h"
    markSeconds: number;         // normalized to seconds
    timing?: 'FAT' | 'hand' | null; // keep null to avoid changing existing code
    wind?: number | null;        // +1.8, -0.2, etc.
    meetName?: string | null;
    meetDate?: string | null;    // ISO date string if available
    athleteName?: string | null;
    school?: string | null;
    lane?: string | null;
    place?: number | null;
};

// A stricter variant (optional) if you later want to ensure non-null timing internally.
// Not used unless you import it explicitly.
export type NormalizedParsedProof = Omit<ParsedProof, 'timing'> & {
    timing: Timing; // 'FAT' | 'hand' | 'auto' | 'unknown'
};

// --- wrapper returned by ingest ---
export type ProofIngestResult = {
    status: ProofStatus;
    confidence: number;          // 0..1
    parsed: ParsedProof;
    source: ProofSource;
    proofUrl?: string;           // optional, helpful for audit
};

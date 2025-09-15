export type ResultRow = {
    event: string | null;
    meet_date: string | null;
    mark_seconds_adj: number | null;
    mark_seconds: number | null;
};

export function dedupeResults<T extends ResultRow>(rows: T[]): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const r of rows) {
        const key = [
            r.event ?? "",
            r.meet_date ?? "",
            r.mark_seconds_adj ?? r.mark_seconds ?? ""
        ].join("|");
        if (!seen.has(key)) {
            seen.add(key);
            out.push(r);
        }
    }
    return out;
}

import { z } from "zod";

export const RankingsQuerySchema = z.object({
    event: z.string().optional(),
    gender: z.enum(["male", "female"]).optional(),
    classYear: z.coerce.number().int().min(1900).max(2100).optional(),
    state: z.string().length(2).optional(),
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(10).max(200).default(50),
    sort: z.enum(["time", "time_adj", "name", "date"]).default("time"),
});

export type SafeRankingsQuery = z.infer<typeof RankingsQuerySchema>;

export function parseRankingsQuery(searchParams: Record<string, string | string[] | undefined>): SafeRankingsQuery {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(searchParams)) {
        obj[k] = Array.isArray(v) ? v[0] : v;
    }
    return RankingsQuerySchema.parse(obj);
}

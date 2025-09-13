export type ResultStatus = "pending" | "verified" | "rejected" | "blocked_until_verified";

export function resultStatusLabel(s: ResultStatus) {
    switch (s) {
        case "verified": return "Approved";
        case "pending": return "Under review";
        case "blocked_until_verified": return "Needs verification";
        case "rejected": return "Not approved";
        default: return s;
    }
}

export function resultStatusClass(s: ResultStatus) {
    switch (s) {
        case "verified": return "text-emerald-700";
        case "pending": return "text-amber-700";
        case "blocked_until_verified": return "text-amber-700";
        case "rejected": return "text-red-700";
        default: return "text-neutral-700";
    }
}

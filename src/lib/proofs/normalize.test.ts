// // src/lib/proofs/normalize.test.ts
// import { describe, it, expect } from "vitest";
// import { normalizeParsed } from "./normalize";
// import type { ParsedProof } from "./types";

// describe("normalizeParsed", () => {
//     it("strips parentheticals and detects timing", () => {
//         const p: ParsedProof = {
//             event: "110H",
//             markText: "26.84 (FAT)",
//             markSeconds: NaN as unknown as number, // force derive from text
//             timing: null,
//             wind: null,
//             meetName: null,
//             meetDate: null,
//             athleteName: null,
//             school: null,
//             lane: null,
//             place: null,
//         };
//         const n = normalizeParsed(p);
//         expect(n.markSeconds).toBeCloseTo(26.84, 2);
//         expect(n.timing).toBe("FAT");
//     });

//     it("handles hand timing '53.7h'", () => {
//         const p: ParsedProof = {
//             event: "300H",
//             markText: "53.7h",
//             markSeconds: NaN as unknown as number,
//             timing: null,
//             wind: null,
//             meetName: null,
//             meetDate: null,
//             athleteName: null,
//             school: null,
//             lane: null,
//             place: null,
//         };
//         const n = normalizeParsed(p);
//         expect(n.markSeconds).toBeCloseTo(53.7, 1);
//         expect(n.timing).toBe("hand");
//     });

//     it("parses mm:ss.xx to seconds", () => {
//         const p: ParsedProof = {
//             event: "800m",
//             markText: "2:01.34",
//             markSeconds: NaN as unknown as number,
//             timing: null,
//             wind: null,
//             meetName: null,
//             meetDate: null,
//             athleteName: null,
//             school: null,
//             lane: null,
//             place: null,
//         };
//         const n = normalizeParsed(p);
//         expect(n.markSeconds).toBeCloseTo(121.34, 2);
//     });
// });

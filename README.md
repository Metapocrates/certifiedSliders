This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# certfiedSliders

## Submit Result Flow

Athlete workflow for adding a mark:

1. **Paste URL**  
   Athlete goes to `/submit-result` and pastes a link from Athletic.net or MileSplit.

2. **Ingest Route**  
   The client calls `POST /api/proofs/ingest` with `{ url }`.  
   - This checks whitelist (Athletic.net, MileSplit).  
   - Calls `parseBySource` to scrape/parse.  
   - Calls `normalizeParsed` to normalize fields.  
   - Returns `{ ok, source, parsed, normalized }`.

3. **Preview & Confirm**  
   The parsed result is shown to the athlete.  
   - If parsing fails, fields can be edited manually.  
   - Athlete confirms submission.

4. **Server Action: confirmSubmitAction**  
   - Validates fields with Zod.  
   - Calls Supabase RPC `adjust_time` (if time-based).  
   - Inserts row into `results` table with `status = pending`.

5. **Admin Verification**  
   Admin sees pending rows in `/admin/results`.  
   - Approves or rejects.  
   - On approve, status → `verified`.  
   - Materialized view `mv_best_event` refresh picks up verified PRs.

6. **Rankings**  
   Public `rankings` page queries `mv_best_event` to show verified best marks.

### Notes
- `results.status = pending` ensures no unverified result shows publicly.
- `adjust_time` handles FAT vs. hand-time adjustments (fallback is +0.24s).
- Parser modules live under `lib/proofs/`.
- You can bypass whitelist during dev by setting `PROOF_BYPASS=1`.

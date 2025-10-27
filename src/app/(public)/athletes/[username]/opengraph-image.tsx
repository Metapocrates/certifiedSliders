// src/app/(public)/athletes/[username]/opengraph-image.tsx
import { Buffer } from "buffer";
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const logoSvgPromise = fetch(new URL("../../../../../public/logo.svg", import.meta.url))
  .then((res) => res.text())
  .catch(() => null);

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  star_rating: number | null;
  school_name: string | null;
  school_state: string | null;
  class_year: number | null;
};

type BestEvent = {
  event: string;
  best_seconds_adj: number | null;
  best_mark_text: string | null;
};

export async function GET(
  _request: Request,
  { params }: { params: { username: string } }
) {
  const username = params.username;
  const logoSvg = await logoSvgPromise;
  const logoDataUri =
    logoSvg && typeof Buffer !== "undefined"
      ? `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`
      : null;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return createFallbackResponse({ username, logoDataUri });
  }

  const profile = await fetchProfile(username);
  if (!profile) {
    return createFallbackResponse({ username, logoDataUri });
  }

  const bestEvent = await fetchBestEvent(profile.id);

  const name = profile.full_name ?? profile.username ?? username;
  const starTier =
    typeof profile.star_rating === "number" ? profile.star_rating : null;
  const certifiedLabel = starTier ? `${starTier}★ Certified` : "Certified slider";
  const schoolBits = [
    profile.school_name ? profile.school_name.trim() : null,
    profile.school_state ? profile.school_state.trim() : null,
  ].filter(Boolean);
  const schoolLine = schoolBits.length ? schoolBits.join(", ") : null;
  const classLine = profile.class_year ? `Class of ${profile.class_year}` : null;

  const metaLine = [schoolLine, classLine].filter(Boolean).join(" • ");
  const bestLine = formatBest(bestEvent);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "56px",
          background:
            "linear-gradient(135deg, #0f172a 0%, #1f2937 55%, #c8102e 100%)",
          color: "white",
          position: "relative",
          fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 15% 20%, rgba(245,197,24,0.28), transparent 55%)",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", gap: "36px" }}>
            <div
              style={{
                width: "170px",
                height: "170px",
                borderRadius: "48px",
                background:
                  "linear-gradient(135deg, rgba(17,24,39,0.4), rgba(255,255,255,0.08))",
                border: "2px solid rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {logoDataUri ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={logoDataUri}
                  alt="Certified Sliders"
                  style={{ width: "70%", height: "70%", objectFit: "contain" }}
                />
              ) : (
                <span style={{ fontSize: "72px" }}>🏃‍♂️</span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div
                style={{
                  fontSize: "32px",
                  letterSpacing: "0.48em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.65)",
                }}
              >
                Certified Sliders
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 24px",
                    borderRadius: "9999px",
                    backgroundColor: "rgba(245,197,24,0.15)",
                    border: "1px solid rgba(245,197,24,0.4)",
                    color: "#f5c518",
                    fontSize: "28px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.24em",
                  }}
                >
                  {certifiedLabel}
                </div>
                <div
                  style={{
                    fontSize: "72px",
                    lineHeight: 1.05,
                    fontWeight: 600,
                    maxWidth: "720px",
                    textWrap: "balance",
                  }}
                >
                  {name}
                </div>
                {metaLine ? (
                  <div
                    style={{
                      fontSize: "28px",
                      color: "rgba(255,255,255,0.75)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {metaLine}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderRadius: "32px",
              padding: "28px 36px",
              backgroundColor: "rgba(17,24,39,0.6)",
              border: "1px solid rgba(255,255,255,0.18)",
              backdropFilter: "blur(6px)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div
                style={{
                  fontSize: "24px",
                  textTransform: "uppercase",
                  letterSpacing: "0.35em",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                Verified highlight
              </div>
              <div
                style={{
                  fontSize: "44px",
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                }}
              >
                {bestLine ?? "Awaiting first certified mark"}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: "8px",
                color: "rgba(255,255,255,0.75)",
                fontSize: "24px",
              }}
            >
              <span>Share your card</span>
              <span style={{ fontSize: "20px" }}>certifiedsliders.com</span>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}

async function fetchProfile(username: string): Promise<Profile | null> {
  const params = new URLSearchParams({
    select: "id,full_name,username,star_rating,school_name,school_state,class_year",
    username: `eq.${username}`,
  });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${params.toString()}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Profile[];
  return data?.[0] ?? null;
}

async function fetchBestEvent(profileId: string): Promise<BestEvent | null> {
  const params = new URLSearchParams({
    select: "event,best_seconds_adj,best_mark_text",
    athlete_id: `eq.${profileId}`,
    order: "best_seconds_adj.asc.nullslast",
    limit: "1",
  });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/mv_best_event?${params.toString()}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as BestEvent[];
  return data?.[0] ?? null;
}

function formatBest(best: BestEvent | null): string | null {
  if (!best) return null;
  const time = fmtMark(best.best_seconds_adj, best.best_mark_text);
  if (!time) return null;
  return `${best.event} • ${time}`;
}

function fmtMark(sec: number | null | undefined, text?: string | null) {
  if (text && text.trim().length > 0) return text;
  if (sec == null) return null;
  const totalSeconds = Number(sec);
  if (!Number.isFinite(totalSeconds)) return null;
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds - minutes * 60;
  return minutes > 0
    ? `${minutes}:${remainder.toFixed(2).padStart(5, "0")}`
    : remainder.toFixed(2);
}

function createFallbackResponse({
  username,
  logoDataUri,
}: {
  username: string;
  logoDataUri: string | null;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "32px",
          background:
            "linear-gradient(135deg, #0f172a 0%, #1f2937 55%, #c8102e 100%)",
          color: "white",
          fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: "140px",
            height: "140px",
            borderRadius: "40px",
            backgroundColor: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {logoDataUri ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={logoDataUri}
              alt="Certified Sliders"
              style={{ width: "70%", height: "70%", objectFit: "contain" }}
            />
          ) : (
            <span style={{ fontSize: "64px" }}>🏃‍♂️</span>
          )}
        </div>
        <div style={{ textAlign: "center", maxWidth: "720px" }}>
          <div
            style={{
              fontSize: "60px",
              fontWeight: 600,
              letterSpacing: "0.02em",
              marginBottom: "16px",
            }}
          >
            Certified Sliders
          </div>
          <div style={{ fontSize: "32px", color: "rgba(255,255,255,0.75)" }}>
            {username} is ready to chase verified marks on certifiedsliders.com
          </div>
        </div>
      </div>
    ),
    size
  );
}

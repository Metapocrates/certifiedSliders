// Route handler for OpenGraph image generation
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const size = { width: 1200, height: 630 };

type CardData = {
  name: string;
  tier: number | null;
  fallbackTier: number | null;
  team: string | null;
  state: string | null;
  classYear: number | null;
  event: string | null;
  mark: string | null;
};

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) => {
  try {
    const resolvedParams = await params;
    const profileId = resolvedParams.profileId;
    const search = new URL(request.url).searchParams;
    const data = parseSearch(search, profileId);

    const tier = data.tier ?? data.fallbackTier ?? 0;
    const certifiedLabel = tier >= 3 && tier <= 5
      ? "★".repeat(tier)
      : tier > 0
        ? `${tier}★`
        : "Certified slider";

    const metaBits = [
      data.team
        ? data.state
          ? `${data.team}, ${data.state}`
          : data.team
        : null,
      data.classYear ? `Class of ${data.classYear}` : null,
    ].filter(Boolean);
    const metaLine = metaBits.join(" • ");
    const bestLine =
      data.event && data.mark ? `${data.event} • ${data.mark}` : null;

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
              <BrandMark />
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
                    {data.name}
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
  } catch {
    const resolvedParams = await params;
    return createFallbackResponse({ username: resolvedParams.profileId });
  }
};

function parseSearch(params: URLSearchParams, username: string): CardData {
  const name = params.get("name")?.trim() || prettifyUsername(username);
  const tier = parseTier(params.get("tier"));
  const fallbackTier = parseTier(params.get("stars"));
  const team = cleanParam(params.get("team"));
  const state = cleanParam(params.get("state"));
  const classYear = parseInteger(params.get("classYear"));
  const event = cleanParam(params.get("event"));
  const mark = cleanParam(params.get("mark"));

  return {
    name,
    tier,
    fallbackTier,
    team,
    state,
    classYear,
    event,
    mark,
  };
}

function parseTier(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanParam(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function prettifyUsername(username: string): string {
  const parts = username.replace(/[-_]/g, " ").split(" ");
  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function createFallbackResponse({ username }: { username: string }) {
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
          <BrandMark size={120} />
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
            {prettifyUsername(username)} is ready to chase verified marks on
            certifiedsliders.com
          </div>
        </div>
      </div>
    ),
    size
  );
}

function BrandMark({ size = 170 }: { size?: number }) {
  const dim = `${size}px`;
  return (
    <div
      style={{
        width: dim,
        height: dim,
        borderRadius: "48px",
        background: "linear-gradient(135deg, rgba(17,24,39,0.4), rgba(255,255,255,0.08))",
        border: "2px solid rgba(255,255,255,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          placeItems: "center",
          width: "70%",
          height: "70%",
          borderRadius: "36px",
          background: "linear-gradient(135deg, rgba(245,197,24,0.9), rgba(200,16,46,0.85))",
          color: "#111827",
          fontSize: size > 140 ? "64px" : "48px",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        CS
      </div>
    </div>
  );
}

import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24 hours

function requireSecret(): string {
  const secret = process.env.CLAIM_TOKEN_SECRET;
  if (!secret) {
    throw new Error("CLAIM_TOKEN_SECRET env var is required for claim links.");
  }
  return secret;
}

export type ClaimPayload = {
  row_id: string;
  user_id: string;
  provider: "athleticnet";
  external_id: string;
  external_numeric_id: string | null;
  nonce: string;
};

type EncodedPayload = ClaimPayload & {
  exp: number;
  iat: number;
  iss: "certified-sliders";
};

function encodePayload(payload: EncodedPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(token: string): EncodedPayload {
  return JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as EncodedPayload;
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export async function makeClaimToken(payload: ClaimPayload, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<string> {
  const secret = requireSecret();
  const now = Math.floor(Date.now() / 1000);
  const encoded: EncodedPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
    iss: "certified-sliders",
  };
  const body = encodePayload(encoded);
  const signature = sign(body, secret);
  return `${body}.${signature}`;
}

export async function verifyClaimToken(token: string): Promise<EncodedPayload> {
  const secret = requireSecret();
  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new Error("BAD_TOKEN");
  }
  const [body, providedSignature] = parts;
  const expectedSignature = sign(body, secret);

  const safeProvided = Buffer.from(providedSignature);
  const safeExpected = Buffer.from(expectedSignature);
  if (
    safeProvided.length !== safeExpected.length ||
    !timingSafeEqual(safeProvided, safeExpected)
  ) {
    throw new Error("BAD_SIGNATURE");
  }

  const decoded = decodePayload(body);
  if (decoded.iss !== "certified-sliders") {
    throw new Error("BAD_ISSUER");
  }

  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp <= now) {
    throw new Error("TOKEN_EXPIRED");
  }

  return decoded;
}

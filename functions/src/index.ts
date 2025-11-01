import { setGlobalOptions } from 'firebase-functions/v2/options';
import { onRequest } from 'firebase-functions/v2/https';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { CollectionReference, DocumentData, DocumentReference, Transaction } from 'firebase-admin/firestore';
import { SignJWT, importPKCS8, importSPKI, jwtVerify, JWTPayload, KeyLike } from 'jose';
import { ulid } from 'ulid';
import { createHash } from 'crypto';

setGlobalOptions({
  region: process.env.FUNCTIONS_REGION ?? 'us-central1',
  memory: '256MiB',
});

initializeApp();

const db = getFirestore();
const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

const SESSION_MAX_DURATION_MS = 20 * 60 * 1000;
const TOKEN_TTL_SECONDS = 90;
const CHECKPOINT_COOLDOWN_MS = 10 * 60 * 1000;
const SOFT_RETRY_LIMIT = 1;

const JWT_AUDIENCE = process.env.DEVICE_CHECKPOINT_JWT_AUDIENCE ?? 'youbounty-device-checkpoint';
const JWT_ISSUER = process.env.DEVICE_CHECKPOINT_JWT_ISSUER ?? 'https://functions.youbounty.app';

type SessionState =
  | 'active'
  | 'ready'
  | 'checkpoint_issued'
  | 'redeemed'
  | 'finished'
  | 'expired'
  | 'cancelled';

type CheckpointStatus = 'ready' | 'issued' | 'redeemed' | 'cancelled';

interface SessionDoc {
  userId: string;
  bountyId: string;
  deviceId: string;
  requiredSeconds: number;
  qualifiedSeconds: number;
  state: SessionState;
  retryCount: number;
  cooldownUntil: Timestamp | null;
  payoutIntentId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp;
  lastPingAt: Timestamp | null;
  activeTokenJti: string | null;
  tokenIssuedAt: Timestamp | null;
  checkpointId?: string | null;
}

interface CheckpointDoc {
  sessionId: string;
  userId: string;
  bountyId: string;
  deviceId: string;
  status: CheckpointStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  issuedAt: Timestamp | null;
  redeemedAt: Timestamp | null;
  codeHash: string | null;
  retryCount: number;
}

interface RedemptionDoc {
  sessionId: string;
  checkpointId: string;
  userId: string;
  bountyId: string;
  deviceId: string;
  codeHash: string;
  payoutIntentId: string | null;
  createdAt: Timestamp;
}

interface VerifiedClaims {
  sessionId: string;
  userId: string;
  deviceId: string;
  bountyId: string | null;
  jti: string;
  payload: JWTPayload;
}

class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };

const terminalStates: ReadonlySet<SessionState> = new Set(['finished', 'expired', 'cancelled']);

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const toTimestamp = (millis: number): Timestamp => Timestamp.fromMillis(millis);

const normalizeKey = (value?: string): string => {
  if (!value) {
    throw new Error('Missing ES256 key material');
  }
  return value.includes('\\n') ? value.replace(/\\n/g, '\n') : value;
};

const hashCheckpointCode = (code: string): string =>
  createHash('sha256').update(code, 'utf8').digest('hex');

let signingKeyPromise: Promise<KeyLike> | null = null;
let verificationKeyPromise: Promise<KeyLike> | null = null;

const getSigningKey = (): Promise<KeyLike> => {
  if (!signingKeyPromise) {
    signingKeyPromise = importPKCS8(normalizeKey(process.env.DEVICE_CHECKPOINT_JWT_PRIVATE_KEY), 'ES256');
  }
  return signingKeyPromise;
};

const getVerificationKey = (): Promise<KeyLike> => {
  if (!verificationKeyPromise) {
    verificationKeyPromise = importSPKI(normalizeKey(process.env.DEVICE_CHECKPOINT_JWT_PUBLIC_KEY), 'ES256');
  }
  return verificationKeyPromise;
};

const mintSessionToken = async (sessionId: string, session: SessionDoc, jti: string): Promise<string> => {
  return new SignJWT({ sid: sessionId, did: session.deviceId, bid: session.bountyId })
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .setAudience(JWT_AUDIENCE)
    .setIssuer(JWT_ISSUER)
    .setSubject(session.userId)
    .setJti(jti)
    .sign(await getSigningKey());
};

const verifySessionToken = async (token: string): Promise<VerifiedClaims> => {
  try {
    const { payload } = await jwtVerify(token, await getVerificationKey(), {
      audience: JWT_AUDIENCE,
      issuer: JWT_ISSUER,
    });
    const sessionId = typeof payload.sid === 'string' ? payload.sid : null;
    const deviceId = typeof payload.did === 'string' ? payload.did : null;
    const userId = typeof payload.sub === 'string' ? payload.sub : null;
    const bountyId = typeof payload.bid === 'string' ? payload.bid : null;
    const jti = typeof payload.jti === 'string' ? payload.jti : null;
    if (!sessionId || !deviceId || !userId || !jti) {
      throw new ApiError(401, 'invalid_token', 'Session token missing required claims.');
    }
    return { sessionId, userId, deviceId, bountyId, jti, payload };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, 'invalid_token', 'Unable to verify session token.');
  }
};

const extractBearer = (req: Request): string | null => {
  const header = req.header('authorization');
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  const token = typeof req.body?.token === 'string' ? req.body.token : null;
  return token ? token.trim() : null;
};

const ensureSessionOwnership = (session: SessionDoc, claims: VerifiedClaims): void => {
  if (session.deviceId !== claims.deviceId || session.userId !== claims.userId) {
    throw new ApiError(403, 'forbidden', 'Token does not match session owner.');
  }
};

const ensureActiveToken = (session: SessionDoc, claims: VerifiedClaims): void => {
  if (session.activeTokenJti && session.activeTokenJti !== claims.jti) {
    throw new ApiError(401, 'token_revoked', 'Session token is no longer active.');
  }
};

const ensureSessionIsFresh = (
  session: SessionDoc,
  nowMillis: number,
  tx: Transaction,
  sessionRef: DocumentReference<SessionDoc>,
): void => {
  if (session.expiresAt.toMillis() <= nowMillis) {
    tx.update(sessionRef, {
      state: 'expired' satisfies SessionState,
      updatedAt: toTimestamp(nowMillis),
      cooldownUntil: toTimestamp(nowMillis + CHECKPOINT_COOLDOWN_MS),
      activeTokenJti: null,
      tokenIssuedAt: toTimestamp(nowMillis),
    });
    throw new ApiError(410, 'session_expired', 'Session has expired.');
  }
};

const sessionsCollection = (): CollectionReference<SessionDoc> =>
  db.collection('sessions') as CollectionReference<SessionDoc>;

const checkpointsCollection = (): CollectionReference<CheckpointDoc> =>
  db.collection('checkpoints') as CollectionReference<CheckpointDoc>;

const redemptionsCollection = (): CollectionReference<RedemptionDoc> =>
  db.collection('redemptions') as CollectionReference<RedemptionDoc>;

const usersCollection = (): CollectionReference<DocumentData> =>
  db.collection('users') as CollectionReference<DocumentData>;

const computeRequiredSeconds = (bountyAmountUsd: number): number => {
  const base = 20 + Math.round(bountyAmountUsd * 60);
  return clamp(base, 20, 120);
};

app.post(
  '/v1/session/start',
  asyncHandler(async (req, res) => {
    const { userId, bountyId, deviceId, bountyAmountUsd, payoutIntentId } = req.body ?? {};
    if (typeof userId !== 'string' || !userId.trim()) {
      throw new ApiError(400, 'invalid_argument', 'userId is required.');
    }
    if (typeof bountyId !== 'string' || !bountyId.trim()) {
      throw new ApiError(400, 'invalid_argument', 'bountyId is required.');
    }
    if (typeof deviceId !== 'string' || !deviceId.trim()) {
      throw new ApiError(400, 'invalid_argument', 'deviceId is required.');
    }
    if (typeof bountyAmountUsd !== 'number' || Number.isNaN(bountyAmountUsd) || bountyAmountUsd <= 0) {
      throw new ApiError(400, 'invalid_argument', 'bountyAmountUsd must be a positive number.');
    }

    const normalizedUserId = userId.trim();
    const normalizedBountyId = bountyId.trim();
    const normalizedDeviceId = deviceId.trim();
    const requiredSeconds = computeRequiredSeconds(bountyAmountUsd);
    const nowMillis = Date.now();
    const nowTs = toTimestamp(nowMillis);
    const expiresTs = toTimestamp(nowMillis + SESSION_MAX_DURATION_MS);
    const sessionId = ulid();
    const sessionsRef = sessionsCollection();
    const sessionRef = sessionsRef.doc(sessionId);
    const userRef = usersCollection().doc(normalizedUserId);

    const { session, tokenJti } = await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      const userData = userSnap.data() ?? {};
      const cooldownUntil = userData.cooldownUntil instanceof Timestamp ? userData.cooldownUntil : null;
      if (cooldownUntil && cooldownUntil.toMillis() > nowMillis) {
        throw new ApiError(429, 'cooldown_active', 'User is in cooldown period.');
      }

      const activeSessionId = typeof userData.activeSessionId === 'string' ? userData.activeSessionId : null;
      if (activeSessionId) {
        const activeRef = sessionsRef.doc(activeSessionId);
        const activeSnap = await tx.get(activeRef);
        if (activeSnap.exists) {
          const activeSession = activeSnap.data() as SessionDoc;
          if (!terminalStates.has(activeSession.state) && activeSession.expiresAt.toMillis() > nowMillis) {
            throw new ApiError(409, 'session_active', 'An active session already exists.');
          }
          if (!terminalStates.has(activeSession.state)) {
            tx.update(activeRef, {
              state: 'expired' satisfies SessionState,
              updatedAt: nowTs,
              cooldownUntil: toTimestamp(nowMillis + CHECKPOINT_COOLDOWN_MS),
              activeTokenJti: null,
              tokenIssuedAt: nowTs,
            });
          }
        }
      }

      const jti = ulid();
      const sessionData: SessionDoc = {
        userId: normalizedUserId,
        bountyId: normalizedBountyId,
        deviceId: normalizedDeviceId,
        requiredSeconds,
        qualifiedSeconds: 0,
        state: 'active',
        retryCount: 0,
        cooldownUntil: null,
        payoutIntentId: typeof payoutIntentId === 'string' && payoutIntentId.trim() ? payoutIntentId.trim() : null,
        createdAt: nowTs,
        updatedAt: nowTs,
        expiresAt: expiresTs,
        lastPingAt: nowTs,
        activeTokenJti: jti,
        tokenIssuedAt: nowTs,
        checkpointId: null,
      };

      tx.set(sessionRef, sessionData);
      tx.set(
        userRef,
        {
          activeSessionId: sessionId,
          cooldownUntil: null,
          updatedAt: nowTs,
        },
        { merge: true },
      );

      return { session: sessionData, tokenJti: jti };
    });

    const token = await mintSessionToken(sessionId, session, tokenJti);
    res.status(201).json({
      sessionId,
      state: session.state,
      requiredSeconds: session.requiredSeconds,
      expiresAt: session.expiresAt.toDate().toISOString(),
      token,
    });
  }),
);

app.post(
  '/v1/session/ping',
  asyncHandler(async (req, res) => {
    const tokenString = extractBearer(req);
    if (!tokenString) {
      throw new ApiError(401, 'missing_token', 'Authorization token is required.');
    }
    const { elapsedSeconds } = req.body ?? {};
    if (typeof elapsedSeconds !== 'number' || !Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
      throw new ApiError(400, 'invalid_argument', 'elapsedSeconds must be a non-negative number.');
    }

    const claims = await verifySessionToken(tokenString);
    const sessionRef = sessionsCollection().doc(claims.sessionId);
    const nowMillis = Date.now();
    const nowTs = toTimestamp(nowMillis);

    const { session, tokenJti } = await db.runTransaction(async (tx) => {
      const snap = await tx.get(sessionRef);
      if (!snap.exists) {
        throw new ApiError(404, 'not_found', 'Session not found.');
      }
      const sessionData = snap.data() as SessionDoc;
      ensureSessionOwnership(sessionData, claims);
      ensureActiveToken(sessionData, claims);
      ensureSessionIsFresh(sessionData, nowMillis, tx, sessionRef);

      if (terminalStates.has(sessionData.state)) {
        throw new ApiError(409, 'session_closed', 'Session is already closed.');
      }

      const qualifiedSeconds = Math.min(
        sessionData.requiredSeconds,
        Math.max(sessionData.qualifiedSeconds, Math.floor(elapsedSeconds)),
      );
      let nextState: SessionState = sessionData.state;
      if (sessionData.state === 'active' || sessionData.state === 'ready') {
        nextState = qualifiedSeconds >= sessionData.requiredSeconds ? 'ready' : 'active';
      }

      const jti = ulid();

      tx.update(sessionRef, {
        qualifiedSeconds,
        state: nextState,
        lastPingAt: nowTs,
        updatedAt: nowTs,
        activeTokenJti: jti,
        tokenIssuedAt: nowTs,
      });

      return { session: { ...sessionData, qualifiedSeconds, state: nextState }, tokenJti: jti };
    });

    const newToken = await mintSessionToken(claims.sessionId, session, tokenJti);
    res.json({
      sessionId: claims.sessionId,
      state: session.state,
      requiredSeconds: session.requiredSeconds,
      qualifiedSeconds: session.qualifiedSeconds,
      ready: session.state === 'ready' || session.state === 'checkpoint_issued' || session.state === 'redeemed',
      token: newToken,
    });
  }),
);

app.post(
  '/v1/checkpoint/ready',
  asyncHandler(async (req, res) => {
    const tokenString = extractBearer(req);
    if (!tokenString) {
      throw new ApiError(401, 'missing_token', 'Authorization token is required.');
    }
    const claims = await verifySessionToken(tokenString);
    const sessionRef = sessionsCollection().doc(claims.sessionId);
    const nowMillis = Date.now();
    const nowTs = toTimestamp(nowMillis);

    const { session, checkpointId, tokenJti } = await db.runTransaction(async (tx) => {
      const snap = await tx.get(sessionRef);
      if (!snap.exists) {
        throw new ApiError(404, 'not_found', 'Session not found.');
      }
      const sessionData = snap.data() as SessionDoc;
      ensureSessionOwnership(sessionData, claims);
      ensureActiveToken(sessionData, claims);
      ensureSessionIsFresh(sessionData, nowMillis, tx, sessionRef);

      if (sessionData.qualifiedSeconds < sessionData.requiredSeconds) {
        throw new ApiError(409, 'not_ready', 'Session has not met required duration.');
      }
      if (terminalStates.has(sessionData.state)) {
        throw new ApiError(409, 'session_closed', 'Session is already closed.');
      }

      let checkpointIdValue = sessionData.checkpointId ?? null;
      let checkpointData: CheckpointDoc | null = null;
      if (checkpointIdValue) {
        const cpRef = checkpointsCollection().doc(checkpointIdValue);
        const cpSnap = await tx.get(cpRef);
        if (cpSnap.exists) {
          checkpointData = cpSnap.data() as CheckpointDoc;
        }
      }

      if (!checkpointData) {
        checkpointIdValue = ulid();
        const checkpointRef = checkpointsCollection().doc(checkpointIdValue);
        checkpointData = {
          sessionId: claims.sessionId,
          userId: sessionData.userId,
          bountyId: sessionData.bountyId,
          deviceId: sessionData.deviceId,
          status: 'ready',
          createdAt: nowTs,
          updatedAt: nowTs,
          issuedAt: null,
          redeemedAt: null,
          codeHash: null,
          retryCount: 0,
        };
        tx.set(checkpointRef, checkpointData);
      } else if (checkpointData.status === 'redeemed') {
        throw new ApiError(409, 'already_redeemed', 'Checkpoint already redeemed.');
      }

      const jti = ulid();
      const nextState: SessionState =
        sessionData.state === 'checkpoint_issued' || sessionData.state === 'redeemed'
          ? sessionData.state
          : 'ready';

      tx.update(sessionRef, {
        checkpointId: checkpointIdValue,
        state: nextState,
        updatedAt: nowTs,
        activeTokenJti: jti,
        tokenIssuedAt: nowTs,
      });

      return {
        session: { ...sessionData, state: nextState, checkpointId: checkpointIdValue },
        checkpointId: checkpointIdValue,
        tokenJti: jti,
      };
    });

    const newToken = await mintSessionToken(claims.sessionId, session, tokenJti);
    res.json({
      sessionId: claims.sessionId,
      checkpointId,
      state: session.state,
      token: newToken,
    });
  }),
);

app.post(
  '/v1/checkpoint/issue',
  asyncHandler(async (req, res) => {
    const tokenString = extractBearer(req);
    if (!tokenString) {
      throw new ApiError(401, 'missing_token', 'Authorization token is required.');
    }
    const claims = await verifySessionToken(tokenString);
    const requestedCheckpointId =
      typeof req.body?.checkpointId === 'string' && req.body.checkpointId.trim()
        ? req.body.checkpointId.trim()
        : null;

    const sessionRef = sessionsCollection().doc(claims.sessionId);
    const nowMillis = Date.now();
    const nowTs = toTimestamp(nowMillis);

    const { session, checkpointId, code, tokenJti } = await db.runTransaction(async (tx) => {
      const snap = await tx.get(sessionRef);
      if (!snap.exists) {
        throw new ApiError(404, 'not_found', 'Session not found.');
      }
      const sessionData = snap.data() as SessionDoc;
      ensureSessionOwnership(sessionData, claims);
      ensureActiveToken(sessionData, claims);
      ensureSessionIsFresh(sessionData, nowMillis, tx, sessionRef);

      if (sessionData.qualifiedSeconds < sessionData.requiredSeconds) {
        throw new ApiError(409, 'not_ready', 'Session has not met required duration.');
      }
      if (terminalStates.has(sessionData.state)) {
        throw new ApiError(409, 'session_closed', 'Session is already closed.');
      }

      const checkpointIdValue = requestedCheckpointId ?? sessionData.checkpointId;
      if (!checkpointIdValue) {
        throw new ApiError(409, 'checkpoint_missing', 'No checkpoint is associated with this session.');
      }

      const checkpointRef = checkpointsCollection().doc(checkpointIdValue);
      const checkpointSnap = await tx.get(checkpointRef);
      if (!checkpointSnap.exists) {
        throw new ApiError(404, 'not_found', 'Checkpoint not found.');
      }
      const checkpoint = checkpointSnap.data() as CheckpointDoc;
      if (checkpoint.sessionId !== claims.sessionId) {
        throw new ApiError(403, 'forbidden', 'Checkpoint does not belong to this session.');
      }
      if (checkpoint.status === 'redeemed') {
        throw new ApiError(409, 'already_redeemed', 'Checkpoint already redeemed.');
      }

      let retryCount = sessionData.retryCount;
      const nextCheckpointRetry = checkpoint.status === 'issued' ? checkpoint.retryCount + 1 : 1;

      if (checkpoint.status === 'issued') {
        if (retryCount >= SOFT_RETRY_LIMIT) {
          throw new ApiError(409, 'retry_exhausted', 'Soft retry limit reached.');
        }
        retryCount += 1;
      }

      const codeValue = ulid().toLowerCase();
      const codeHash = hashCheckpointCode(codeValue);
      const jti = ulid();

      tx.update(checkpointRef, {
        status: 'issued' satisfies CheckpointStatus,
        issuedAt: nowTs,
        updatedAt: nowTs,
        codeHash,
        retryCount: nextCheckpointRetry,
      });

      tx.update(sessionRef, {
        state: 'checkpoint_issued' satisfies SessionState,
        retryCount,
        updatedAt: nowTs,
        checkpointId: checkpointIdValue,
        activeTokenJti: jti,
        tokenIssuedAt: nowTs,
      });

      return {
        session: { ...sessionData, state: 'checkpoint_issued', retryCount, checkpointId: checkpointIdValue },
        checkpointId: checkpointIdValue,
        code: codeValue,
        tokenJti: jti,
      };
    });

    const newToken = await mintSessionToken(claims.sessionId, session, tokenJti);
    res.json({
      sessionId: claims.sessionId,
      checkpointId,
      state: session.state,
      retryCount: session.retryCount,
      code,
      token: newToken,
    });
  }),
);

app.post(
  '/v1/checkpoint/redeem',
  asyncHandler(async (req, res) => {
    const tokenString = extractBearer(req);
    if (!tokenString) {
      throw new ApiError(401, 'missing_token', 'Authorization token is required.');
    }
    const claims = await verifySessionToken(tokenString);
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (!code) {
      throw new ApiError(400, 'invalid_argument', 'code is required.');
    }
    if (code.length > 128) {
      throw new ApiError(400, 'invalid_argument', 'code exceeds maximum length.');
    }

    const requestedCheckpointId =
      typeof req.body?.checkpointId === 'string' && req.body.checkpointId.trim()
        ? req.body.checkpointId.trim()
        : null;
    const payoutIntentId =
      typeof req.body?.payoutIntentId === 'string' && req.body.payoutIntentId.trim()
        ? req.body.payoutIntentId.trim()
        : null;

    const sessionRef = sessionsCollection().doc(claims.sessionId);
    const codeHash = hashCheckpointCode(code);
    const nowMillis = Date.now();
    const nowTs = toTimestamp(nowMillis);

    const {
      session,
      checkpointId,
      redemptionId,
      tokenJti,
    } = await db.runTransaction(async (tx) => {
      const snap = await tx.get(sessionRef);
      if (!snap.exists) {
        throw new ApiError(404, 'not_found', 'Session not found.');
      }
      const sessionData = snap.data() as SessionDoc;
      ensureSessionOwnership(sessionData, claims);
      ensureActiveToken(sessionData, claims);
      ensureSessionIsFresh(sessionData, nowMillis, tx, sessionRef);

      if (terminalStates.has(sessionData.state)) {
        throw new ApiError(409, 'session_closed', 'Session is already closed.');
      }
      if (sessionData.state !== 'checkpoint_issued' && sessionData.state !== 'redeemed') {
        throw new ApiError(409, 'checkpoint_not_issued', 'Checkpoint has not been issued.');
      }

      const checkpointIdValue = requestedCheckpointId ?? sessionData.checkpointId;
      if (!checkpointIdValue) {
        throw new ApiError(409, 'checkpoint_missing', 'No checkpoint is associated with this session.');
      }

      const checkpointRef = checkpointsCollection().doc(checkpointIdValue);
      const checkpointSnap = await tx.get(checkpointRef);
      if (!checkpointSnap.exists) {
        throw new ApiError(404, 'not_found', 'Checkpoint not found.');
      }
      const checkpoint = checkpointSnap.data() as CheckpointDoc;
      if (checkpoint.sessionId !== claims.sessionId) {
        throw new ApiError(403, 'forbidden', 'Checkpoint does not belong to this session.');
      }
      if (!checkpoint.codeHash) {
        throw new ApiError(409, 'checkpoint_not_issued', 'Checkpoint has not been issued.');
      }
      if (checkpoint.codeHash !== codeHash) {
        throw new ApiError(403, 'invalid_code', 'Checkpoint code is invalid.');
      }

      const redemptionQuery = await tx.get(
        redemptionsCollection()
          .where('sessionId', '==', claims.sessionId)
          .where('checkpointId', '==', checkpointIdValue)
          .limit(1),
      );

      if (!redemptionQuery.empty) {
        const existing = redemptionQuery.docs[0].data() as RedemptionDoc;
        const existingJti = sessionData.activeTokenJti ?? claims.jti;
        return {
          session: {
            ...sessionData,
            state: 'redeemed',
            payoutIntentId: payoutIntentId ?? sessionData.payoutIntentId ?? existing.payoutIntentId ?? null,
          },
          checkpointId: checkpointIdValue,
          redemptionId: redemptionQuery.docs[0].id,
          tokenJti: existingJti,
        };
      }

      const jti = ulid();
      const redemptionIdValue = ulid();
      const redemptionRef = redemptionsCollection().doc(redemptionIdValue);

      tx.set(redemptionRef, {
        sessionId: claims.sessionId,
        checkpointId: checkpointIdValue,
        userId: sessionData.userId,
        bountyId: sessionData.bountyId,
        deviceId: sessionData.deviceId,
        codeHash,
        payoutIntentId: payoutIntentId ?? sessionData.payoutIntentId ?? null,
        createdAt: nowTs,
      });

      tx.update(checkpointRef, {
        status: 'redeemed' satisfies CheckpointStatus,
        redeemedAt: nowTs,
        updatedAt: nowTs,
      });

      tx.update(sessionRef, {
        state: 'redeemed' satisfies SessionState,
        payoutIntentId: payoutIntentId ?? sessionData.payoutIntentId ?? null,
        updatedAt: nowTs,
        activeTokenJti: jti,
        tokenIssuedAt: nowTs,
      });

      return {
        session: {
          ...sessionData,
          state: 'redeemed',
          payoutIntentId: payoutIntentId ?? sessionData.payoutIntentId ?? null,
        },
        checkpointId: checkpointIdValue,
        redemptionId: redemptionIdValue,
        tokenJti: jti,
      };
    });

    const newToken = await mintSessionToken(claims.sessionId, session, tokenJti);
    res.json({
      sessionId: claims.sessionId,
      checkpointId,
      redemptionId,
      state: session.state,
      payoutIntentId: session.payoutIntentId,
      token: newToken,
    });
  }),
);

app.post(
  '/v1/session/finish',
  asyncHandler(async (req, res) => {
    const tokenString = extractBearer(req);
    if (!tokenString) {
      throw new ApiError(401, 'missing_token', 'Authorization token is required.');
    }
    const claims = await verifySessionToken(tokenString);
    const outcome =
      typeof req.body?.outcome === 'string'
        ? (req.body.outcome.trim().toLowerCase() as 'success' | 'cancelled' | 'aborted')
        : 'success';
    const payoutIntentId =
      typeof req.body?.payoutIntentId === 'string' && req.body.payoutIntentId.trim()
        ? req.body.payoutIntentId.trim()
        : null;

    const sessionRef = sessionsCollection().doc(claims.sessionId);
    const userRef = usersCollection().doc(claims.userId);
    const nowMillis = Date.now();
    const nowTs = toTimestamp(nowMillis);

    const session = await db.runTransaction(async (tx) => {
      const snap = await tx.get(sessionRef);
      if (!snap.exists) {
        throw new ApiError(404, 'not_found', 'Session not found.');
      }
      const sessionData = snap.data() as SessionDoc;
      ensureSessionOwnership(sessionData, claims);
      ensureActiveToken(sessionData, claims);

      let nextState: SessionState = sessionData.state;
      let cooldownUntil: Timestamp | null = sessionData.cooldownUntil ?? null;

      if (outcome === 'success') {
        if (sessionData.state !== 'redeemed' && sessionData.state !== 'finished') {
          throw new ApiError(409, 'not_redeemed', 'Session must be redeemed before finishing.');
        }
        nextState = 'finished';
        cooldownUntil = null;
      } else {
        nextState = 'cancelled';
        cooldownUntil = toTimestamp(nowMillis + CHECKPOINT_COOLDOWN_MS);
      }

      tx.update(sessionRef, {
        state: nextState,
        payoutIntentId: payoutIntentId ?? sessionData.payoutIntentId ?? null,
        cooldownUntil,
        updatedAt: nowTs,
        activeTokenJti: null,
        tokenIssuedAt: nowTs,
      });

      tx.set(
        userRef,
        {
          activeSessionId: null,
          cooldownUntil,
          updatedAt: nowTs,
        },
        { merge: true },
      );

      return {
        ...sessionData,
        state: nextState,
        payoutIntentId: payoutIntentId ?? sessionData.payoutIntentId ?? null,
        cooldownUntil,
      };
    });

    res.json({
      sessionId: claims.sessionId,
      state: session.state,
      payoutIntentId: session.payoutIntentId,
      cooldownUntil: session.cooldownUntil ? session.cooldownUntil.toDate().toISOString() : null,
    });
  }),
);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? null,
      },
    });
    return;
  }
  console.error(err);
  res.status(500).json({
    error: {
      code: 'internal',
      message: 'Internal server error.',
    },
  });
});

export const api = onRequest(app);

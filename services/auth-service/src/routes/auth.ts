/**
 * Auth routes — /auth/*
 *
 * POST   /auth/register          — create user account
 * POST   /auth/login             — issue RS256 access + refresh tokens
 * POST   /auth/refresh           — rotate token pair
 * GET    /auth/me                — return current user profile
 * DELETE /auth/account           — soft-delete + anonymize (GDPR)
 * GET    /auth/.well-known/jwks.json — public key for offline QR validation
 */
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import pool from '../db/client';
import { getPrivateKey, getJwks } from '../keys';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { Role, AccessTokenPayload, UserRow } from '../types';

const router = Router();

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 7;
const BCRYPT_ROUNDS = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function issueAccessToken(userId: string, emailAnon: string, role: Role, venueId?: string | null): string {
  const payload: AccessTokenPayload = {
    sub: userId,
    email: emailAnon,
    role,
    ...(venueId ? { venueId } : {}),
  };
  return jwt.sign(payload, getPrivateKey(), { algorithm: 'RS256', expiresIn: ACCESS_TOKEN_TTL });
}

async function issueRefreshToken(userId: string): Promise<string> {
  const raw = uuidv4() + '-' + uuidv4();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO refresh_tokens (token_id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [uuidv4(), userId, tokenHash, expiresAt],
  );

  return raw;
}

// ─── Enforce Content-Type on POST/DELETE ─────────────────────────────────────

function requireJson(req: Request, res: Response, next: () => void): void {
  if (!req.is('application/json')) {
    res.status(415).json({ error: 'Content-Type must be application/json' });
    return;
  }
  next();
}

// ─── POST /auth/register ─────────────────────────────────────────────────────

router.post('/register', requireJson, async (req: Request, res: Response): Promise<void> => {
  const { email, password, role } = req.body as { email?: string; password?: string; role?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const assignedRole: Role = (['ATTENDEE', 'STAFF', 'ADMIN', 'EMERGENCY'].includes(role ?? '') ? role as Role : 'ATTENDEE');

  try {
    const emailHash = await bcrypt.hash(normalizedEmail, BCRYPT_ROUNDS);
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userId = uuidv4();

    await pool.query(
      `INSERT INTO users (user_id, email_hash, email_anon, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, emailHash, normalizedEmail, passwordHash, assignedRole],
    );

    res.status(201).json({ userId, role: assignedRole });
  } catch (err: unknown) {
    const pg = err as { code?: string };
    if (pg.code === '23505') {
      res.status(409).json({ error: 'Email already registered' });
    } else {
      console.error('[register]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────

router.post('/login', requireJson, async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Fetch all non-deleted users and compare bcrypt hashes (email is hashed)
    const result = await pool.query<UserRow>(
      `SELECT * FROM users WHERE deleted_at IS NULL`,
    );

    let matchedUser: UserRow | null = null;
    for (const row of result.rows) {
      const emailMatch = await bcrypt.compare(normalizedEmail, row.email_hash);
      if (emailMatch) {
        matchedUser = row;
        break;
      }
    }

    if (!matchedUser) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, matchedUser.password_hash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const accessToken = issueAccessToken(matchedUser.user_id, matchedUser.email_anon, matchedUser.role, matchedUser.venue_id);
    const refreshToken = await issueRefreshToken(matchedUser.user_id);

    res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

router.post('/refresh', requireJson, async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (!refreshToken) {
    res.status(400).json({ error: 'refreshToken is required' });
    return;
  }

  const tokenHash = hashToken(refreshToken);

  try {
    const result = await pool.query<{
      token_id: string;
      user_id: string;
      expires_at: Date;
      revoked: boolean;
    }>(
      `SELECT token_id, user_id, expires_at, revoked
       FROM refresh_tokens
       WHERE token_hash = $1`,
      [tokenHash],
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const record = result.rows[0];

    if (record.revoked || new Date(record.expires_at) < new Date()) {
      res.status(401).json({ error: 'Refresh token expired or revoked' });
      return;
    }

    // Revoke old token (rotation)
    await pool.query(`UPDATE refresh_tokens SET revoked = TRUE WHERE token_id = $1`, [record.token_id]);

    // Fetch user
    const userResult = await pool.query<UserRow>(
      `SELECT * FROM users WHERE user_id = $1 AND deleted_at IS NULL`,
      [record.user_id],
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({ error: 'User not found or deleted' });
      return;
    }

    const user = userResult.rows[0];
    const accessToken = issueAccessToken(user.user_id, user.email_anon, user.role, user.venue_id);
    const newRefreshToken = await issueRefreshToken(user.user_id);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error('[refresh]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  try {
    const result = await pool.query<UserRow>(
      `SELECT user_id, email_anon, role, venue_id, location_consent_given, created_at
       FROM users WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const u = result.rows[0];
    res.json({
      userId: u.user_id,
      email: u.email_anon,
      role: u.role,
      venueId: u.venue_id,
      locationConsentGiven: u.location_consent_given,
    });
  } catch (err) {
    console.error('[me]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /auth/account ─────────────────────────────────────────────────────

router.delete('/account', requireJson, requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  try {
    const anonymizedEmail = `deleted_${userId}@venueflow.invalid`;

    const result = await pool.query(
      `UPDATE users
       SET deleted_at = NOW(),
           email_anon = $1,
           location_consent_given = FALSE
       WHERE user_id = $2 AND deleted_at IS NULL
       RETURNING user_id`,
      [anonymizedEmail, userId],
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found or already deleted' });
      return;
    }

    // Revoke all refresh tokens
    await pool.query(`UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`, [userId]);

    res.status(204).send();
  } catch (err) {
    console.error('[delete account]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /auth/.well-known/jwks.json ─────────────────────────────────────────

router.get('/.well-known/jwks.json', (_req: Request, res: Response): void => {
  res.json(getJwks());
});

export default router;

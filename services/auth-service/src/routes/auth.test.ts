/**
 * Unit tests for Auth Service endpoints.
 * Tests: token issuance, expiry, refresh rotation, account deletion anonymization.
 * Validates: Requirements 6.5, 9.3
 *
 * Uses supertest against the Express app with a mocked pg Pool.
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { initKeys, getPublicKey, getPrivateKey } from '../keys';

// ─── Mock pg pool ─────────────────────────────────────────────────────────────
// We mock the db/client module so tests don't need a real PostgreSQL instance.

const mockQuery = jest.fn();
jest.mock('../db/client', () => ({
  __esModule: true,
  default: { query: (...args: unknown[]) => mockQuery(...args) },
}));

// Import app AFTER mocking
import app from '../index';

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(() => {
  initKeys();
});

beforeEach(() => {
  mockQuery.mockReset();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeUserRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    user_id: 'user-123',
    email_hash: '$2b$10$hashedEmail',
    email_anon: 'test@example.com',
    password_hash: '$2b$10$hashedPassword',
    role: 'ATTENDEE',
    venue_id: null,
    location_consent_given: false,
    created_at: new Date(),
    deleted_at: null,
    ...overrides,
  };
}

// ─── POST /auth/register ──────────────────────────────────────────────────────

describe('POST /auth/register', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .set('Content-Type', 'application/json')
      .send({ password: 'secret123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .set('Content-Type', 'application/json')
      .send({ email: 'user@example.com' });
    expect(res.status).toBe(400);
  });

  it('returns 415 when Content-Type is not application/json', async () => {
    const res = await request(app)
      .post('/auth/register')
      .set('Content-Type', 'text/plain')
      .send('email=x&password=y');
    expect(res.status).toBe(415);
  });

  it('creates user and returns 201 with userId and role', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app)
      .post('/auth/register')
      .set('Content-Type', 'application/json')
      .send({ email: 'new@example.com', password: 'pass1234' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('userId');
    expect(res.body.role).toBe('ATTENDEE');
  });

  it('defaults role to ATTENDEE when not provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app)
      .post('/auth/register')
      .set('Content-Type', 'application/json')
      .send({ email: 'another@example.com', password: 'pass1234' });

    expect(res.body.role).toBe('ATTENDEE');
  });

  it('returns 409 on duplicate email (pg unique violation)', async () => {
    const err = Object.assign(new Error('duplicate'), { code: '23505' });
    mockQuery.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/auth/register')
      .set('Content-Type', 'application/json')
      .send({ email: 'dup@example.com', password: 'pass1234' });

    expect(res.status).toBe(409);
  });
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  it('returns 400 when credentials are missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 when no users exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'nobody@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });

  it('issues RS256 access token and refresh token on valid credentials', async () => {
    const bcrypt = await import('bcrypt');
    const emailHash = await bcrypt.hash('user@example.com', 10);
    const passwordHash = await bcrypt.hash('correct-password', 10);

    const userRow = makeUserRow({ email_hash: emailHash, password_hash: passwordHash });

    // First query: fetch all users
    mockQuery.mockResolvedValueOnce({ rows: [userRow] });
    // Second query: insert refresh token
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'user@example.com', password: 'correct-password' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');

    // Verify the access token is a valid RS256 JWT
    const decoded = jwt.verify(res.body.accessToken, getPublicKey(), { algorithms: ['RS256'] }) as Record<string, unknown>;
    expect(decoded.sub).toBe('user-123');
    expect(decoded.role).toBe('ATTENDEE');
  });

  it('access token expires in ~15 minutes', async () => {
    const bcrypt = await import('bcrypt');
    const emailHash = await bcrypt.hash('exp@example.com', 10);
    const passwordHash = await bcrypt.hash('pass', 10);
    const userRow = makeUserRow({ email_hash: emailHash, password_hash: passwordHash });

    mockQuery.mockResolvedValueOnce({ rows: [userRow] });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'exp@example.com', password: 'pass' });

    const decoded = jwt.decode(res.body.accessToken) as { exp: number; iat: number };
    const ttlSeconds = decoded.exp - decoded.iat;
    // Should be 15 minutes = 900 seconds (allow ±5s tolerance)
    expect(ttlSeconds).toBeGreaterThanOrEqual(895);
    expect(ttlSeconds).toBeLessThanOrEqual(905);
  });
});

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

describe('POST /auth/refresh', () => {
  it('returns 400 when refreshToken is missing', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .set('Content-Type', 'application/json')
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 for unknown refresh token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/auth/refresh')
      .set('Content-Type', 'application/json')
      .send({ refreshToken: 'unknown-token' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for revoked refresh token', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        token_id: 'tok-1',
        user_id: 'user-123',
        expires_at: new Date(Date.now() + 86400000),
        revoked: true,
      }],
    });

    const res = await request(app)
      .post('/auth/refresh')
      .set('Content-Type', 'application/json')
      .send({ refreshToken: 'revoked-token' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for expired refresh token', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        token_id: 'tok-2',
        user_id: 'user-123',
        expires_at: new Date(Date.now() - 1000), // expired
        revoked: false,
      }],
    });

    const res = await request(app)
      .post('/auth/refresh')
      .set('Content-Type', 'application/json')
      .send({ refreshToken: 'expired-token' });

    expect(res.status).toBe(401);
  });

  it('rotates tokens — returns new pair and revokes old token', async () => {
    const userRow = makeUserRow();

    // 1. lookup token
    mockQuery.mockResolvedValueOnce({
      rows: [{
        token_id: 'tok-3',
        user_id: 'user-123',
        expires_at: new Date(Date.now() + 86400000),
        revoked: false,
      }],
    });
    // 2. revoke old token
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // 3. fetch user
    mockQuery.mockResolvedValueOnce({ rows: [userRow] });
    // 4. insert new refresh token
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app)
      .post('/auth/refresh')
      .set('Content-Type', 'application/json')
      .send({ refreshToken: 'valid-token' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');

    // Verify revoke was called
    const revokeCall = mockQuery.mock.calls[1];
    expect(revokeCall[0]).toContain('revoked = TRUE');
  });
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

describe('GET /auth/me', () => {
  it('returns 401 without Authorization header', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });

  it('returns user profile for valid token', async () => {
    const userRow = makeUserRow();
    mockQuery.mockResolvedValueOnce({ rows: [userRow] });

    // Issue a real token
    const token = jwt.sign(
      { sub: 'user-123', email: 'test@example.com', role: 'ATTENDEE' },
      getPrivateKey(),
      { algorithm: 'RS256', expiresIn: '15m' },
    );

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('user-123');
    expect(res.body.role).toBe('ATTENDEE');
  });
});

// ─── DELETE /auth/account ─────────────────────────────────────────────────────

describe('DELETE /auth/account', () => {
  it('returns 401 without Authorization header', async () => {
    const res = await request(app)
      .delete('/auth/account')
      .set('Content-Type', 'application/json')
      .send({});
    expect(res.status).toBe(401);
  });

  it('soft-deletes user and anonymizes email', async () => {
    // UPDATE users returns 1 row
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 'user-123' }], rowCount: 1 });
    // UPDATE refresh_tokens
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const token = jwt.sign(
      { sub: 'user-123', email: 'test@example.com', role: 'ATTENDEE' },
      getPrivateKey(),
      { algorithm: 'RS256', expiresIn: '15m' },
    );

    const res = await request(app)
      .delete('/auth/account')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(204);

    // Verify anonymized email format in the UPDATE query
    const updateCall = mockQuery.mock.calls[0];
    expect(updateCall[1][0]).toBe('deleted_user-123@venueflow.invalid');
  });

  it('returns 404 when user is already deleted', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const token = jwt.sign(
      { sub: 'user-123', email: 'test@example.com', role: 'ATTENDEE' },
      getPrivateKey(),
      { algorithm: 'RS256', expiresIn: '15m' },
    );

    const res = await request(app)
      .delete('/auth/account')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(404);
  });

  it('clears locationConsentGiven on deletion', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 'user-123' }], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const token = jwt.sign(
      { sub: 'user-123', email: 'test@example.com', role: 'ATTENDEE' },
      getPrivateKey(),
      { algorithm: 'RS256', expiresIn: '15m' },
    );

    await request(app)
      .delete('/auth/account')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    // The UPDATE query should set location_consent_given = FALSE
    const updateSql = mockQuery.mock.calls[0][0] as string;
    expect(updateSql).toContain('location_consent_given = FALSE');
  });
});

// ─── GET /auth/.well-known/jwks.json ─────────────────────────────────────────

describe('GET /auth/.well-known/jwks.json', () => {
  it('returns a JWKS with at least one RS256 key', async () => {
    const res = await request(app).get('/auth/.well-known/jwks.json');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('keys');
    expect(Array.isArray(res.body.keys)).toBe(true);
    expect(res.body.keys.length).toBeGreaterThan(0);
    expect(res.body.keys[0].alg).toBe('RS256');
    expect(res.body.keys[0].use).toBe('sig');
  });
});

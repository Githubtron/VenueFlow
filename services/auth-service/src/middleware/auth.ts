/**
 * requireAuth middleware — verifies RS256 JWT from Authorization: Bearer <token>
 * and attaches the decoded payload to req.user.
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getPublicKey } from '../keys';
import { AccessTokenPayload } from '../types';

export interface AuthRequest extends Request {
  user?: AccessTokenPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, getPublicKey(), { algorithms: ['RS256'] }) as AccessTokenPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired access token' });
  }
}

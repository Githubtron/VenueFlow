/**
 * Offline-capable QR ticket (JWT) validation.
 * Uses RS256 — verifies signature with venue public key.
 * Property 2: Offline QR Validation Correctness
 */
import jwt from 'jsonwebtoken';

export interface TicketPayload {
  ticketId: string;
  attendeeId: string;
  eventId: string;
  seatSection: string;
  venueId: string;
  iat?: number;
  exp?: number;
}

export type ValidationResult =
  | { valid: true; payload: TicketPayload }
  | { valid: false; reason: string };

/**
 * Validates a QR ticket JWT using the venue's RS256 public key.
 * Works offline — no network call required.
 */
export function validateTicket(
  qrPayload: string,
  publicKey: string,
): ValidationResult {
  try {
    const decoded = jwt.verify(qrPayload, publicKey, {
      algorithms: ['RS256'],
    }) as TicketPayload;

    if (!decoded.ticketId || !decoded.attendeeId || !decoded.eventId) {
      return { valid: false, reason: 'Missing required ticket fields' };
    }

    return { valid: true, payload: decoded };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { valid: false, reason: message };
  }
}

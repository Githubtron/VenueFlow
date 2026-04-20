/**
 * RS256 key management.
 *
 * In production, set JWT_PRIVATE_KEY and JWT_PUBLIC_KEY env vars (PEM strings).
 * In development, a key pair is generated at startup if the env vars are absent.
 */
import crypto from 'crypto';

let privateKey: string;
let publicKey: string;

function generateKeyPair(): void {
  const { privateKey: priv, publicKey: pub } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  privateKey = priv;
  publicKey = pub;
  console.warn('[auth-service] Generated ephemeral RSA key pair (dev mode). Set JWT_PRIVATE_KEY/JWT_PUBLIC_KEY for production.');
}

export function initKeys(): void {
  if (process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY) {
    privateKey = process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
    publicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
  } else {
    generateKeyPair();
  }
}

export function getPrivateKey(): string {
  if (!privateKey) initKeys();
  return privateKey;
}

export function getPublicKey(): string {
  if (!publicKey) initKeys();
  return publicKey;
}

/** JWK Set representation of the public key for JWKS endpoint. */
export function getJwks(): object {
  const keyObj = crypto.createPublicKey(getPublicKey());
  const jwk = keyObj.export({ format: 'jwk' }) as Record<string, unknown>;
  return {
    keys: [
      {
        ...jwk,
        use: 'sig',
        alg: 'RS256',
        kid: 'venueflow-auth-key-1',
      },
    ],
  };
}

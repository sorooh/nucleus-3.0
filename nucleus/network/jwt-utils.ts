/**
 * JWT Utilities for WebSocket Authentication
 * Built from absolute zero for Surooh Empire
 */

import * as crypto from 'crypto';

interface JWTPayload {
  platform: string;
  exp: number;
  iat: number;
  iss?: string;  // Issuer (e.g., 'surooh.auth')
  aud?: string;  // Audience (e.g., 'surooh.platforms')
}

/**
 * Verify JWT token using HMAC-SHA256
 */
export function verifyJWT(token: string, secret: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature
    const message = `${headerB64}.${payloadB64}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('base64url');

    if (signatureB64 !== expectedSignature) {
      console.error('[JWT] Invalid signature');
      return null;
    }

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    ) as JWTPayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.error('[JWT] Token expired');
      return null;
    }

    return payload;
  } catch (error: any) {
    console.error('[JWT] Verification error:', error.message);
    return null;
  }
}

/**
 * Generate JWT token using HMAC-SHA256
 */
export function generateJWT(platform: string, secret: string, expiresIn: number = 86400): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    platform,
    iat: now,
    exp: now + expiresIn
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const message = `${headerB64}.${payloadB64}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64url');

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Generate HMAC-SHA256 signature for request body
 * Used for X-Surooh-Signature header
 */
export function signHmac(secret: string, body: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
}

/**
 * Verify HMAC-SHA256 signature from X-Surooh-Signature header
 */
export function verifyHmac(secret: string, body: string, signature: string): boolean {
  const expectedSignature = signHmac(secret, body);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

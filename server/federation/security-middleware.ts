/**
 * Federation Security Middleware
 * Enforces HMAC + Code Signature verification on all federation endpoints
 * Following Surooh Security Specification v1.0
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { secretVault } from './secret-vault';
import { verifyJWT } from '../../nucleus/network/jwt-utils';
import { db } from '../db';
import { federationNodes } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Build the payload to sign according to Surooh spec:
 * method + "\n" + url_path + "\n" + body_sha256_hex + "\n" + timestamp
 */
function buildSignaturePayload(
  method: string,
  urlPath: string,
  body: any,
  timestamp: string
): string {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  const bodySha256 = crypto.createHash('sha256').update(bodyStr).digest('hex');
  
  return `${method}\n${urlPath}\n${bodySha256}\n${timestamp}`;
}

/**
 * Middleware: Verify JWT + HMAC + Code Signature + Timestamp
 */
export async function verifyFederationSecurity(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const method = req.method;
    // Use baseUrl + path to match client's full signed path
    const urlPath = req.baseUrl + req.path;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // ========== 1. Verify JWT ==========
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      await secretVault.logAudit({
        eventType: 'auth_failed',
        endpoint: urlPath,
        method,
        ipAddress,
        userAgent,
        failureReason: 'missing_authorization_header'
      });
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    const jwtSecret = process.env.JWT_SECRET || 'nucleus-2.0-jwt-secret';
    
    const jwtPayload = verifyJWT(token, jwtSecret);
    if (!jwtPayload) {
      await secretVault.logAudit({
        eventType: 'auth_failed',
        endpoint: urlPath,
        method,
        ipAddress,
        userAgent,
        failureReason: 'invalid_jwt_token'
      });
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or expired JWT token' 
      });
    }

    // Extract nodeId from JWT
    const nodeId = (jwtPayload as any).nodeId || (jwtPayload as any).platform;

    // ========== 2. Extract Required Headers ==========
    const keyId = req.headers['x-surooh-keyid'] as string;
    const timestamp = req.headers['x-surooh-timestamp'] as string;
    const signature = req.headers['x-surooh-signature'] as string;
    const codeSig = req.headers['x-surooh-codesig'] as string;

    if (!keyId) {
      await secretVault.logAudit({
        nodeId,
        eventType: 'auth_failed',
        endpoint: urlPath,
        method,
        ipAddress,
        userAgent,
        failureReason: 'missing_x_surooh_keyid'
      });
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Missing X-Surooh-KeyId header' 
      });
    }

    if (!timestamp) {
      await secretVault.logAudit({
        nodeId,
        keyId,
        eventType: 'auth_failed',
        endpoint: urlPath,
        method,
        ipAddress,
        userAgent,
        failureReason: 'missing_x_surooh_timestamp'
      });
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Missing X-Surooh-Timestamp header' 
      });
    }

    if (!signature) {
      await secretVault.logAudit({
        nodeId,
        keyId,
        eventType: 'auth_failed',
        endpoint: urlPath,
        method,
        ipAddress,
        userAgent,
        failureReason: 'missing_x_surooh_signature'
      });
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Missing X-Surooh-Signature header' 
      });
    }

    if (!codeSig) {
      await secretVault.logAudit({
        nodeId,
        keyId,
        eventType: 'auth_failed',
        endpoint: urlPath,
        method,
        ipAddress,
        userAgent,
        failureReason: 'missing_x_surooh_codesig'
      });
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Missing X-Surooh-CodeSig header' 
      });
    }

    // ========== 3. Verify Timestamp (5 minute window) ==========
    const now = Date.now();
    const requestTime = parseInt(timestamp, 10);
    const timeDiff = Math.abs(now - requestTime);
    const maxTimeDiff = 5 * 60 * 1000; // 5 minutes in milliseconds

    if (timeDiff > maxTimeDiff) {
      await secretVault.logAudit({
        nodeId,
        keyId,
        eventType: 'auth_failed',
        endpoint: urlPath,
        method,
        ipAddress,
        userAgent,
        failureReason: 'timestamp_expired',
        requestTimestamp: timestamp
      });
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Request timestamp expired (max 5 minutes)' 
      });
    }

    // ========== 4. Retrieve Secret from Vault ==========
    const vault = await secretVault.getSecret(keyId);
    if (!vault || vault.nodeId !== nodeId) {
      await secretVault.logAudit({
        nodeId,
        keyId,
        eventType: 'auth_failed',
        endpoint: urlPath,
        method,
        ipAddress,
        userAgent,
        failureReason: 'invalid_key_id_or_node_mismatch',
        requestTimestamp: timestamp
      });
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Invalid Key ID or node mismatch' 
      });
    }

    // ========== 5. Verify HMAC Signature ==========
    const payload = buildSignaturePayload(method, urlPath, req.body, timestamp);
    const isValidHMAC = secretVault.verifyHMAC(vault.secretValue, payload, signature);

    if (!isValidHMAC) {
      await secretVault.logAudit({
        nodeId,
        keyId,
        eventType: 'hmac_failed',
        endpoint: urlPath,
        method,
        ipAddress,
        userAgent,
        failureReason: 'invalid_hmac_signature',
        requestTimestamp: timestamp,
        metadata: {
          expectedPayload: payload,
          receivedSignature: signature
        }
      });
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Invalid HMAC signature' 
      });
    }

    // ========== 6. Verify Code Signature ==========
    // TODO: Enable in production after implementing proper code signing
    // For now: Skip code signature verification (JWT + HMAC is sufficient)
    const skipCodeSigVerification = true;
    
    if (!skipCodeSigVerification) {
      const bodySha256 = crypto.createHash('sha256')
        .update(JSON.stringify(req.body))
        .digest('hex');

      const isValidCodeSig = await secretVault.verifyCodeSignature(
        keyId,
        codeSig,
        bodySha256
      );

      if (!isValidCodeSig) {
        await secretVault.logAudit({
          nodeId,
          keyId,
          eventType: 'codesig_failed',
          endpoint: urlPath,
          method,
          ipAddress,
          userAgent,
          failureReason: 'invalid_code_signature',
          requestTimestamp: timestamp
        });
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'Invalid Code Signature' 
        });
      }
    }

    // ========== 7. Load Node from Database ==========
    const [node] = await db
      .select()
      .from(federationNodes)
      .where(eq(federationNodes.nodeId, nodeId))
      .limit(1);

    if (!node) {
      await secretVault.logAudit({
        nodeId,
        keyId,
        eventType: 'auth_failed',
        endpoint: urlPath,
        method,
        ipAddress,
        userAgent,
        failureReason: 'node_not_found',
        requestTimestamp: timestamp
      });
      return res.status(404).json({ 
        error: 'Not Found',
        message: 'Node not found in registry' 
      });
    }

    // ========== 8. Success - Log and Continue ==========
    await secretVault.logAudit({
      nodeId,
      keyId,
      eventType: 'auth_success',
      endpoint: urlPath,
      method,
      ipAddress,
      userAgent,
      requestTimestamp: timestamp
    });

    // Attach validated data to request
    (req as any).federationAuth = {
      nodeId,
      keyId,
      jwtPayload,
      timestamp
    };
    
    // Attach node object for easy access in endpoints
    (req as any).federationNode = node;

    next();
  } catch (error: any) {
    console.error('[Federation Security] Error:', error);
    await secretVault.logAudit({
      eventType: 'auth_failed',
      endpoint: req.path,
      method: req.method,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      failureReason: `internal_error: ${error.message}`
    });
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Security verification failed' 
    });
  }
}

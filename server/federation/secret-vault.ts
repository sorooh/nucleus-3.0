/**
 * Federation Secret Vault (SCV)
 * Secure storage and management for HMAC secrets and Code signatures
 * Following Surooh Security Standards
 */

import crypto from 'crypto';
import { db } from '../db';
import { federationSecretVault, federationAuditLog } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export class SecretVaultManager {
  
  /**
   * Store a new secret in the vault
   */
  async storeSecret(params: {
    keyId: string;
    nodeId: string;
    organizationId: string;
    secretType: 'hmac' | 'code_signature' | 'jwt';
    secretValue: string;
    algorithm?: string;
    publicKey?: string;
    codeHash?: string;
    expiresAt?: Date;
  }) {
    const {
      keyId,
      nodeId,
      organizationId,
      secretType,
      secretValue,
      algorithm = 'HMAC-SHA256',
      publicKey,
      codeHash,
      expiresAt
    } = params;

    // Check if key already exists
    const existing = await db
      .select()
      .from(federationSecretVault)
      .where(eq(federationSecretVault.keyId, keyId))
      .limit(1);

    if (existing.length > 0) {
      throw new Error(`Key ID ${keyId} already exists in vault`);
    }

    // Store secret (encrypted in production)
    const [vault] = await db.insert(federationSecretVault).values({
      keyId,
      nodeId,
      organizationId,
      secretType,
      secretValue, // TODO: encrypt in production
      algorithm,
      publicKey,
      codeHash,
      status: 'active',
      version: 1,
      expiresAt
    }).returning();

    return vault;
  }

  /**
   * Retrieve secret by Key ID
   */
  async getSecret(keyId: string) {
    const [vault] = await db
      .select()
      .from(federationSecretVault)
      .where(
        and(
          eq(federationSecretVault.keyId, keyId),
          eq(federationSecretVault.status, 'active')
        )
      )
      .limit(1);

    if (!vault) {
      return null;
    }

    // Check expiration
    if (vault.expiresAt && vault.expiresAt < new Date()) {
      return null;
    }

    // Update last used timestamp
    await db
      .update(federationSecretVault)
      .set({ lastUsedAt: new Date() })
      .where(eq(federationSecretVault.keyId, keyId));

    return vault;
  }

  /**
   * Rotate a secret (create new version)
   */
  async rotateSecret(keyId: string, newSecretValue: string) {
    const existing = await this.getSecret(keyId);
    if (!existing) {
      throw new Error(`Key ID ${keyId} not found`);
    }

    // Mark old version as rotated
    await db
      .update(federationSecretVault)
      .set({ 
        status: 'rotated',
        rotatedAt: new Date()
      })
      .where(eq(federationSecretVault.keyId, keyId));

    // Create new version
    const newKeyId = `${keyId}_v${existing.version + 1}`;
    return this.storeSecret({
      keyId: newKeyId,
      nodeId: existing.nodeId,
      organizationId: existing.organizationId,
      secretType: existing.secretType as any,
      secretValue: newSecretValue,
      algorithm: existing.algorithm,
      publicKey: existing.publicKey || undefined,
      codeHash: existing.codeHash || undefined
    });
  }

  /**
   * Revoke a secret
   */
  async revokeSecret(keyId: string) {
    await db
      .update(federationSecretVault)
      .set({ status: 'revoked' })
      .where(eq(federationSecretVault.keyId, keyId));
  }

  /**
   * Verify HMAC signature
   */
  verifyHMAC(secret: string, payload: string, signature: string): boolean {
    try {
      // Extract version and signature
      const match = signature.match(/^v1=(.+)$/);
      if (!match) {
        return false;
      }

      const providedSignature = match[1];
      
      // Compute expected signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // Constant-time comparison
      return crypto.timingSafeEqual(
        Buffer.from(providedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate HMAC signature
   */
  generateHMAC(secret: string, payload: string): string {
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return `v1=${signature}`;
  }

  /**
   * Verify Code Signature
   */
  async verifyCodeSignature(
    keyId: string,
    providedSignature: string,
    bodySha256: string
  ): Promise<boolean> {
    const vault = await this.getSecret(keyId);
    if (!vault) {
      return false;
    }

    try {
      // Extract version and signature
      const match = providedSignature.match(/^v1=(.+)$/);
      if (!match) {
        return false;
      }

      const signatureHex = match[1];

      // Verify signature matches registered code signature
      if (vault.codeHash && vault.codeHash === signatureHex) {
        // Code signature matches registered signature
        return true;
      }

      // In production: verify with public key + bodySha256
      // For now: simple signature comparison
      return vault.codeHash === signatureHex;
    } catch (error) {
      return false;
    }
  }

  /**
   * Log audit event
   */
  async logAudit(params: {
    nodeId?: string;
    keyId?: string;
    eventType: string;
    endpoint: string;
    method: string;
    ipAddress?: string;
    userAgent?: string;
    failureReason?: string;
    requestTimestamp?: string;
    metadata?: any;
  }) {
    await db.insert(federationAuditLog).values({
      nodeId: params.nodeId || null,
      keyId: params.keyId || null,
      eventType: params.eventType,
      endpoint: params.endpoint,
      method: params.method,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      failureReason: params.failureReason || null,
      requestTimestamp: params.requestTimestamp || null,
      metadata: params.metadata || null
    });
  }
}

export const secretVault = new SecretVaultManager();

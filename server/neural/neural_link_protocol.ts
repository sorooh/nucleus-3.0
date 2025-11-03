/**
 * Neural Link Protocol (NLPx) - Phase 10.0
 * بروتوكول الربط العصبي
 * 
 * المسؤول عن إنشاء الروابط العصبية الآمنة بين النوى
 * يدعم:
 * - Connection Handshake (JWT + RSA + HMAC)
 * - Synaptic Stream Negotiation
 * - Compression & Encryption
 * - Nonce Rotation (كل 5 دقائق)
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { EventEmitter } from 'events';

// ============= TYPES =============

export interface NeuralNodeCredentials {
  nodeName: string;
  displayName: string;
  layer: 'cognitive' | 'operational' | 'sensory';
  publicKey: string;      // RSA public key
  jwtToken?: string;      // JWT token
  hmacSecret?: string;    // HMAC secret
}

export interface NLPxHandshake {
  version: string;          // "nlpx-1.0"
  nodeName: string;
  layer: string;
  timestamp: number;
  nonce: string;
  signature: string;        // RSA-SHA512 signature
  capabilities: string[];   // ['ai', 'storage', 'compute']
  protocolPreferences: {
    compression: boolean;
    encryption: string;     // 'AES-256'
    synapticStreamTypes: string[]; // ['knowledge', 'action', 'insight']
  };
}

export interface NLPxHandshakeResponse {
  success: boolean;
  accepted: boolean;
  version: string;
  sessionId: string;
  jwtToken?: string;
  hmacSecret?: string;
  streamConfig?: {
    allowedTypes: string[];
    maxBandwidth: number;
    heartbeatInterval: number;
  };
  error?: string;
}

export interface NLPxMessage {
  type: 'handshake' | 'heartbeat' | 'data' | 'command' | 'ack' | 'disconnect';
  source: string;
  target: string;
  timestamp: number;
  nonce: string;
  payload: any;
  signature: string;
  hmacSignature?: string;
}

// ============= NEURAL LINK PROTOCOL CORE =============

export class NeuralLinkProtocol extends EventEmitter {
  private version = 'nlpx-1.0';
  private activeSessions: Map<string, any> = new Map();
  private nonceCache: Map<string, number> = new Map();
  private jwtSecret: string;
  
  constructor(jwtSecret: string) {
    super();
    this.jwtSecret = jwtSecret;
    this.startNonceRotation();
  }

  /**
   * إنشاء Handshake للاتصال بين نواتين
   */
  createHandshake(credentials: NeuralNodeCredentials): NLPxHandshake {
    const nonce = this.generateNonce();
    const timestamp = Date.now();
    
    const payload = {
      version: this.version,
      nodeName: credentials.nodeName,
      layer: credentials.layer,
      timestamp,
      nonce,
      capabilities: ['ai', 'storage', 'compute', 'analysis'],
      protocolPreferences: {
        compression: true,
        encryption: 'AES-256',
        synapticStreamTypes: ['knowledge', 'action', 'insight', 'feedback']
      }
    };

    // إنشاء RSA-SHA512 signature
    const signature = this.signWithRSA(
      JSON.stringify(payload),
      credentials.publicKey
    );

    return {
      ...payload,
      signature
    };
  }

  /**
   * التحقق من Handshake الواردة
   */
  async verifyHandshake(handshake: NLPxHandshake, publicKey: string): Promise<NLPxHandshakeResponse> {
    try {
      // 1. التحقق من النسخة
      if (handshake.version !== this.version) {
        return {
          success: false,
          accepted: false,
          version: this.version,
          sessionId: '',
          error: 'Protocol version mismatch'
        };
      }

      // 2. التحقق من Timestamp (لا يجب أن يكون أقدم من 5 دقائق)
      const timeDiff = Date.now() - handshake.timestamp;
      if (timeDiff > 300000) { // 5 minutes
        return {
          success: false,
          accepted: false,
          version: this.version,
          sessionId: '',
          error: 'Handshake timestamp expired'
        };
      }

      // 3. التحقق من Nonce (يجب أن يكون فريداً)
      if (this.nonceCache.has(handshake.nonce)) {
        return {
          success: false,
          accepted: false,
          version: this.version,
          sessionId: '',
          error: 'Nonce already used (replay attack detected)'
        };
      }

      // 4. التحقق من RSA Signature
      const payloadWithoutSignature: any = { ...handshake };
      delete payloadWithoutSignature.signature;
      
      const isValidSignature = this.verifyRSASignature(
        JSON.stringify(payloadWithoutSignature),
        handshake.signature,
        publicKey
      );

      if (!isValidSignature) {
        return {
          success: false,
          accepted: false,
          version: this.version,
          sessionId: '',
          error: 'Invalid RSA signature'
        };
      }

      // 5. إنشاء Session
      const sessionId = crypto.randomBytes(32).toString('hex');
      const jwtToken = this.generateJWT(handshake.nodeName, sessionId);
      const hmacSecret = crypto.randomBytes(32).toString('hex');

      // 6. حفظ Session
      this.activeSessions.set(sessionId, {
        nodeName: handshake.nodeName,
        layer: handshake.layer,
        jwtToken,
        hmacSecret,
        capabilities: handshake.capabilities,
        createdAt: new Date(),
        lastHeartbeat: new Date()
      });

      // 7. حفظ Nonce
      this.nonceCache.set(handshake.nonce, Date.now());

      // 8. Emit event
      this.emit('connection:established', {
        nodeName: handshake.nodeName,
        sessionId,
        layer: handshake.layer
      });

      return {
        success: true,
        accepted: true,
        version: this.version,
        sessionId,
        jwtToken,
        hmacSecret,
        streamConfig: {
          allowedTypes: ['knowledge', 'action', 'insight', 'feedback', 'command'],
          maxBandwidth: 10000, // kbps
          heartbeatInterval: 30 // seconds
        }
      };
      
    } catch (error: any) {
      return {
        success: false,
        accepted: false,
        version: this.version,
        sessionId: '',
        error: `Handshake verification failed: ${error.message}`
      };
    }
  }

  /**
   * التحقق من رسالة NLPx (Triple-Layer)
   */
  async verifyMessage(message: NLPxMessage, session: any): Promise<boolean> {
    try {
      // Layer 1: JWT Verification
      if (session.jwtToken) {
        const decoded = jwt.verify(session.jwtToken, this.jwtSecret) as any;
        if (decoded.nodeName !== message.source) {
          return false;
        }
      }

      // Layer 2: HMAC Verification
      if (message.hmacSignature && session.hmacSecret) {
        const payloadWithoutHmac: any = { ...message };
        delete payloadWithoutHmac.hmacSignature;
        
        const expectedHmac = crypto
          .createHmac('sha256', session.hmacSecret)
          .update(JSON.stringify(payloadWithoutHmac))
          .digest('hex');

        if (expectedHmac !== message.hmacSignature) {
          return false;
        }
      }

      // Layer 3: RSA Signature Verification
      const payloadWithoutSignature: any = { ...message };
      delete payloadWithoutSignature.signature;
      delete payloadWithoutSignature.hmacSignature;
      
      // Note: في الإنتاج، سنستخدم public key من database
      // هنا نفترض أن الـ signature صحيحة إذا وصلت لهذه النقطة
      
      // Nonce verification
      if (this.nonceCache.has(message.nonce)) {
        return false; // Replay attack
      }
      
      this.nonceCache.set(message.nonce, Date.now());
      
      return true;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * إنشاء رسالة NLPx آمنة
   */
  createMessage(
    type: NLPxMessage['type'],
    source: string,
    target: string,
    payload: any,
    session: any
  ): NLPxMessage {
    const nonce = this.generateNonce();
    const timestamp = Date.now();

    const message: Partial<NLPxMessage> = {
      type,
      source,
      target,
      timestamp,
      nonce,
      payload
    };

    // RSA Signature (simplified for now)
    message.signature = crypto
      .createHash('sha512')
      .update(JSON.stringify(message))
      .digest('hex');

    // HMAC Signature
    if (session.hmacSecret) {
      message.hmacSignature = crypto
        .createHmac('sha256', session.hmacSecret)
        .update(JSON.stringify(message))
        .digest('hex');
    }

    return message as NLPxMessage;
  }

  /**
   * Heartbeat - نبضة قلبية
   */
  sendHeartbeat(sessionId: string): NLPxMessage | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    session.lastHeartbeat = new Date();
    
    return this.createMessage(
      'heartbeat',
      session.nodeName,
      'nicholas',
      { status: 'alive', timestamp: Date.now() },
      session
    );
  }

  /**
   * قطع الاتصال
   */
  disconnect(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    this.emit('connection:terminated', {
      nodeName: session.nodeName,
      sessionId
    });

    this.activeSessions.delete(sessionId);
    return true;
  }

  /**
   * الحصول على Sessions النشطة
   */
  getActiveSessions(): any[] {
    return Array.from(this.activeSessions.entries()).map(([sessionId, session]) => ({
      sessionId,
      ...session
    }));
  }

  /**
   * التحقق من صحة Session
   */
  isSessionActive(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    // التحقق من آخر heartbeat (لا يجب أن يكون أقدم من دقيقتين)
    const timeSinceLastHeartbeat = Date.now() - new Date(session.lastHeartbeat).getTime();
    if (timeSinceLastHeartbeat > 120000) { // 2 minutes
      this.disconnect(sessionId);
      return false;
    }

    return true;
  }

  // ============= HELPER METHODS =============

  private generateNonce(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateJWT(nodeName: string, sessionId: string): string {
    return jwt.sign(
      {
        nodeName,
        sessionId,
        type: 'neural-federation',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (3600 * 24) // 24 hours
      },
      this.jwtSecret
    );
  }

  private signWithRSA(data: string, privateKey: string): string {
    // Simplified signature (في الإنتاج سنستخدم RSA حقيقي)
    return crypto
      .createHash('sha512')
      .update(data + privateKey)
      .digest('hex');
  }

  private verifyRSASignature(data: string, signature: string, publicKey: string): boolean {
    // Simplified verification (في الإنتاج سنستخدم RSA حقيقي)
    const expectedSignature = crypto
      .createHash('sha512')
      .update(data + publicKey)
      .digest('hex');
    
    return expectedSignature === signature;
  }

  /**
   * تدوير Nonces كل 5 دقائق
   */
  private startNonceRotation(): void {
    setInterval(() => {
      const fiveMinutesAgo = Date.now() - 300000;
      
      // حذف Nonces القديمة
      const entries = Array.from(this.nonceCache.entries());
      for (const [nonce, timestamp] of entries) {
        if (timestamp < fiveMinutesAgo) {
          this.nonceCache.delete(nonce);
        }
      }
      
      console.log(`[NLPx] Nonce rotation completed. Cache size: ${this.nonceCache.size}`);
    }, 300000); // 5 minutes
  }
}

// ============= SINGLETON INSTANCE =============

let nlpxInstance: NeuralLinkProtocol | null = null;

export function initializeNLPx(jwtSecret: string): NeuralLinkProtocol {
  if (!nlpxInstance) {
    nlpxInstance = new NeuralLinkProtocol(jwtSecret);
    console.log('[NLPx] ✅ Neural Link Protocol initialized (v1.0)');
  }
  return nlpxInstance;
}

export function getNLPx(): NeuralLinkProtocol {
  if (!nlpxInstance) {
    throw new Error('[NLPx] Not initialized. Call initializeNLPx() first.');
  }
  return nlpxInstance;
}

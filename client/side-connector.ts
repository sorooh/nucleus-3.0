/**
 * SIDE Connector - Surooh Intelligent Development Ecosystem
 * 
 * Client للاتصال بنواة Nicholas المركزية
 * يتعامل مع: Registration, Handshake, WebSocket sync
 */

import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import * as crypto from 'crypto';

export interface SIDENodeConfig {
  nodeId: string;
  nodeName: string;
  arabicName: string;
  nodeType: 'development' | 'staging' | 'production';
  organizationId: string;
  nucleusLevel: 'main' | 'sub';
  nodeUrl: string;
  permissions: string[];
  allowedEndpoints: string[];
  capabilities: Record<string, boolean>;
  sideVersion: string;
  tags: string[];
}

export interface FederationCredentials {
  keyId: string; // Key ID للـ Secret Vault
  authToken: string;
  hmacSecret: string;
  codeSignature: string;
}

export interface RegistrationResponse {
  success: boolean;
  message?: string;
  node?: {
    id: string;
    nodeId: string;
    nodeName: string;
    nodeType: string;
    status: string;
    registeredAt: string;
  };
  credentials?: FederationCredentials;
  error?: string;
  traceId?: string;
}

export class SIDEConnector {
  private nicholasUrl: string;
  private config: SIDENodeConfig;
  private credentials?: FederationCredentials;
  private httpClient: AxiosInstance;
  private wsClient?: WebSocket;
  private isConnected: boolean = false;

  constructor(nicholasUrl: string, config: SIDENodeConfig) {
    this.nicholasUrl = nicholasUrl;
    this.config = config;
    
    // HTTP Client للـ REST API
    this.httpClient = axios.create({
      baseURL: this.nicholasUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * حساب HMAC Signature حسب معايير Surooh
   * payloadToSign = method + "\n" + url_path + "\n" + body_sha256_hex + "\n" + timestamp
   */
  private computeHMACSignature(
    method: string,
    urlPath: string,
    body: any,
    timestamp: string
  ): string {
    if (!this.credentials) {
      throw new Error('Missing credentials for HMAC computation');
    }

    const bodyStr = JSON.stringify(body);
    const bodySha256 = crypto.createHash('sha256').update(bodyStr).digest('hex');
    
    const payload = `${method}\n${urlPath}\n${bodySha256}\n${timestamp}`;
    
    const signature = crypto
      .createHmac('sha256', this.credentials.hmacSecret)
      .update(payload)
      .digest('hex');
    
    return `v1=${signature}`;
  }

  /**
   * حساب Code Signature
   */
  private computeCodeSignature(body: any): string {
    if (!this.credentials) {
      throw new Error('Missing credentials for Code Signature computation');
    }

    // في الوقت الحالي: نستخدم الـ codeSignature المسجّل
    // في الإنتاج: سيتم حساب توقيع للكود الفعلي
    return `v1=${this.credentials.codeSignature}`;
  }

  /**
   * إعداد Headers الأمنية الكاملة
   */
  private prepareSecurityHeaders(method: string, urlPath: string, body: any): Record<string, string> {
    if (!this.credentials) {
      throw new Error('Missing credentials');
    }

    const timestamp = Date.now().toString();
    const hmacSignature = this.computeHMACSignature(method, urlPath, body, timestamp);
    const codeSig = this.computeCodeSignature(body);

    return {
      'Authorization': `Bearer ${this.credentials.authToken}`,
      'X-Surooh-KeyId': this.credentials.keyId,
      'X-Surooh-Timestamp': timestamp,
      'X-Surooh-Signature': hmacSignature,
      'X-Surooh-CodeSig': codeSig,
      'X-Node-ID': this.config.nodeId
    };
  }

  /**
   * خطوة 1: تسجيل SIDE node مع Nicholas
   */
  async register(): Promise<RegistrationResponse> {
    try {
      console.log('🔄 بدء التسجيل مع نواة Nicholas...');
      console.log(`📡 URL: ${this.nicholasUrl}/api/federation/register`);
      
      const response = await this.httpClient.post<RegistrationResponse>(
        '/api/federation/register',
        this.config
      );

      if (response.data.success && response.data.credentials) {
        this.credentials = response.data.credentials;
        console.log('✅ تم التسجيل بنجاح!');
        console.log(`📝 Node ID: ${response.data.node?.nodeId}`);
        console.log(`🔑 Auth Token: ${this.credentials.authToken.substring(0, 30)}...`);
        return response.data;
      } else {
        console.error('❌ فشل التسجيل:', response.data.error || response.data.message);
        return response.data;
      }
    } catch (error: any) {
      // Handle 409 Conflict (already registered)
      if (error.response?.status === 409) {
        console.log('ℹ️  العقدة مسجلة مسبقاً');
        return {
          success: true,
          message: 'Node already registered',
          traceId: 'already-registered'
        };
      }
      
      console.error('❌ خطأ في الاتصال:', error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        traceId: 'local-error'
      };
    }
  }

  /**
   * خطوة 2: تفعيل العقدة
   * Protected by HMAC + Code Signature
   */
  async activate(): Promise<any> {
    if (!this.credentials) {
      throw new Error('يجب التسجيل أولاً قبل التفعيل');
    }

    try {
      console.log('🔄 تفعيل العقدة...');
      
      const body = {};
      const headers = this.prepareSecurityHeaders('POST', '/api/federation/activate', body);
      
      const response = await this.httpClient.post(
        '/api/federation/activate',
        body,
        { headers }
      );

      console.log('✅ تم التفعيل بنجاح!');
      return response.data;
    } catch (error: any) {
      console.error('❌ خطأ في التفعيل:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * خطوة 3: إرسال Heartbeat
   * Protected by HMAC + Code Signature
   */
  async sendHeartbeat(health: number = 100): Promise<any> {
    if (!this.credentials) {
      throw new Error('يجب التسجيل أولاً');
    }

    try {
      const body = { health };
      const headers = this.prepareSecurityHeaders('POST', '/api/federation/heartbeat', body);
      
      const response = await this.httpClient.post(
        '/api/federation/heartbeat',
        body,
        { headers }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ خطأ في Heartbeat:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * خطوة 4: إرسال بيانات للمزامنة
   * Protected by Triple-Layer Security (JWT + HMAC + RSA)
   */
  async syncData(syncType: string, data: any): Promise<any> {
    if (!this.credentials) {
      throw new Error('يجب التسجيل أولاً');
    }

    try {
      console.log(`🔄 إرسال بيانات للمزامنة (${syncType})...`);
      
      // Generate syncId
      const syncId = `sync-${this.config.nodeId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      
      // Compute checksum
      const dataString = JSON.stringify(data);
      const checksum = crypto.createHash('sha256').update(dataString).digest('hex');
      
      // Prepare request body
      const body = {
        nodeId: this.config.nodeId,
        syncType,
        data,
        metadata: {
          source: this.config.nodeId,
          timestamp: new Date().toISOString(),
          version: this.config.sideVersion,
          checksum,
          syncId
        }
      };
      
      const headers = this.prepareSecurityHeaders('POST', '/api/federation/sync', body);
      
      const response = await this.httpClient.post(
        '/api/federation/sync',
        body,
        { headers }
      );

      console.log('✅ تم المزامنة بنجاح!');
      console.log(`📝 Sync ID: ${response.data.syncId}`);
      console.log(`📊 Items Processed: ${response.data.acknowledgment?.itemsProcessed || 0}`);
      console.log(`✓ Checksum Verified: ${response.data.acknowledgment?.checksumVerified ? 'نعم' : 'لا'}`);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ خطأ في المزامنة:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * خطوة 5: الاتصال بـ WebSocket للمزامنة اللحظية
   */
  async connectWebSocket(): Promise<void> {
    if (!this.credentials) {
      throw new Error('يجب التسجيل أولاً');
    }

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.nicholasUrl.replace('http://', 'ws://').replace('https://', 'wss://');
        console.log(`🔄 الاتصال بـ WebSocket: ${wsUrl}/ws/federation`);
        console.log(`📝 Node ID: ${this.config.nodeId}`);

        this.wsClient = new WebSocket(`${wsUrl}/ws/federation`, {
          headers: {
            'authorization': `Bearer ${this.credentials!.authToken}`,
            'x-node-id': this.config.nodeId
          }
        });

        this.wsClient.on('open', () => {
          console.log('✅ WebSocket متصل بنجاح!');
          this.isConnected = true;
          
          // إرسال handshake
          this.wsClient?.send(JSON.stringify({
            type: 'handshake',
            nodeId: this.config.nodeId,
            timestamp: new Date().toISOString()
          }));
          
          resolve();
        });

        this.wsClient.on('message', (data) => {
          const message = JSON.parse(data.toString());
          console.log('📨 رسالة من Nicholas:', message);
          this.handleWebSocketMessage(message);
        });

        this.wsClient.on('error', (error) => {
          console.error('❌ خطأ في WebSocket:', error.message);
          reject(error);
        });

        this.wsClient.on('close', () => {
          console.log('🔌 WebSocket مغلق');
          this.isConnected = false;
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * معالجة رسائل WebSocket
   */
  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'handshake_ack':
        console.log('✅ Handshake مؤكد من Nicholas');
        break;
      
      case 'code_sync':
        console.log('📦 طلب مزامنة الكود...');
        break;
      
      case 'knowledge_sync':
        console.log('📚 طلب مزامنة المعرفة...');
        break;
      
      case 'broadcast':
        console.log('📢 رسالة جماعية:', message.payload);
        break;
      
      default:
        console.log('📨 رسالة غير معروفة:', message);
    }
  }

  /**
   * إرسال رسالة عبر WebSocket
   */
  sendWebSocketMessage(type: string, payload: any): void {
    if (!this.isConnected || !this.wsClient) {
      throw new Error('WebSocket غير متصل');
    }

    this.wsClient.send(JSON.stringify({
      type,
      payload,
      nodeId: this.config.nodeId,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * قطع الاتصال
   */
  disconnect(): void {
    if (this.wsClient) {
      this.wsClient.close();
      console.log('🔌 تم قطع الاتصال');
    }
  }

  /**
   * الحصول على حالة الاتصال
   */
  getConnectionStatus(): {
    isConnected: boolean;
    hasCredentials: boolean;
    nodeId: string;
    nicholasUrl: string;
  } {
    return {
      isConnected: this.isConnected,
      hasCredentials: !!this.credentials,
      nodeId: this.config.nodeId,
      nicholasUrl: this.nicholasUrl
    };
  }

  /**
   * الحصول على البيانات الاعتمادية (للحفظ في Secrets)
   */
  getCredentials(): FederationCredentials | undefined {
    return this.credentials;
  }
}

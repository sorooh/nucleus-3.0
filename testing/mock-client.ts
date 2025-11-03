/**
 * Mock Client for Testing Unified Gateway Authentication
 * 
 * يوفر طريقتين للمصادقة:
 * 1. INTERNAL_JWT - للمنصات الداخلية (16 منصة)
 * 2. ENHANCED (JWT + HMAC) - للمنصات الخارجية (CodeMaster, Designer Pro)
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import axios, { AxiosInstance } from 'axios';

export interface PlatformConfig {
  platformId: string;
  displayName: string;
  authMode: 'INTERNAL_JWT' | 'ENHANCED';
  jwtSecret: string;
  apiKey?: string; // للـ ENHANCED mode
  hmacSecret?: string; // للـ ENHANCED mode
  baseURL?: string;
}

export class UnifiedGatewayClient {
  private config: PlatformConfig;
  private client: AxiosInstance;

  constructor(config: PlatformConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL || 'http://localhost:5000',
      timeout: 30000,
    });
  }

  /**
   * Generate JWT Token
   */
  private generateJWT(): string {
    const payload = {
      platform: this.config.platformId,
      displayName: this.config.displayName,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    };

    return jwt.sign(payload, this.config.jwtSecret);
  }

  /**
   * Generate HMAC Signature
   */
  private generateHMACSignature(payload: any, timestamp: string): string {
    if (!this.config.hmacSecret) {
      throw new Error('HMAC secret not configured');
    }

    const data = JSON.stringify(payload) + timestamp;
    return crypto
      .createHmac('sha256', this.config.hmacSecret)
      .update(data)
      .digest('hex');
  }

  /**
   * Make authenticated request (INTERNAL_JWT mode)
   */
  async requestJWT(method: string, path: string, data?: any) {
    const token = this.generateJWT();

    return this.client.request({
      method,
      url: path,
      data,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Make authenticated request (ENHANCED mode - JWT + HMAC)
   */
  async requestEnhanced(method: string, path: string, data?: any) {
    if (!this.config.apiKey || !this.config.hmacSecret) {
      throw new Error('API Key or HMAC Secret not configured for ENHANCED mode');
    }

    const timestamp = Date.now().toString();
    const signature = this.generateHMACSignature(data || {}, timestamp);

    return this.client.request({
      method,
      url: path,
      data,
      headers: {
        'X-API-Key': this.config.apiKey,
        'X-Platform-ID': this.config.platformId,
        'X-Timestamp': timestamp,
        'X-Signature': signature,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Auto-detect auth mode and make request
   */
  async request(method: string, path: string, data?: any) {
    if (this.config.authMode === 'ENHANCED') {
      return this.requestEnhanced(method, path, data);
    } else {
      return this.requestJWT(method, path, data);
    }
  }

  /**
   * Convenience methods
   */
  async get(path: string) {
    return this.request('GET', path);
  }

  async post(path: string, data: any) {
    return this.request('POST', path, data);
  }

  async put(path: string, data: any) {
    return this.request('PUT', path, data);
  }

  async delete(path: string) {
    return this.request('DELETE', path);
  }
}

/**
 * Example Usage - CodeMaster Platform (ENHANCED)
 */
export function createCodeMasterClient(credentials: {
  jwtSecret: string;
  apiKey: string;
  hmacSecret: string;
}): UnifiedGatewayClient {
  return new UnifiedGatewayClient({
    platformId: 'codemaster',
    displayName: 'CodeMaster Platform',
    authMode: 'ENHANCED',
    jwtSecret: credentials.jwtSecret,
    apiKey: credentials.apiKey,
    hmacSecret: credentials.hmacSecret,
  });
}

/**
 * Example Usage - Internal Platform (INTERNAL_JWT)
 */
export function createInternalClient(
  platformId: string,
  displayName: string,
  jwtSecret: string
): UnifiedGatewayClient {
  return new UnifiedGatewayClient({
    platformId,
    displayName,
    authMode: 'INTERNAL_JWT',
    jwtSecret,
  });
}

/**
 * Test Client Factory
 */
export class TestClientFactory {
  /**
   * Create test client with auto-generated credentials
   */
  static async createTestClient(
    platformId: string,
    authMode: 'INTERNAL_JWT' | 'ENHANCED' = 'INTERNAL_JWT'
  ): Promise<{
    client: UnifiedGatewayClient;
    credentials: any;
  }> {
    // Generate test credentials
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    const apiKey = authMode === 'ENHANCED' 
      ? `${platformId}_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`
      : undefined;
    const hmacSecret = authMode === 'ENHANCED'
      ? crypto.randomBytes(32).toString('hex')
      : undefined;

    const credentials = {
      platformId,
      jwtSecret,
      apiKey,
      hmacSecret,
    };

    const client = new UnifiedGatewayClient({
      platformId,
      displayName: `Test Platform (${platformId})`,
      authMode,
      jwtSecret,
      apiKey,
      hmacSecret,
    });

    return { client, credentials };
  }
}

/**
 * Rate Limit Testing Helper
 */
export class RateLimitTester {
  private client: UnifiedGatewayClient;

  constructor(client: UnifiedGatewayClient) {
    this.client = client;
  }

  /**
   * Test rate limiting by sending multiple requests
   */
  async testBurst(endpoint: string, count: number): Promise<{
    successful: number;
    rateLimited: number;
    errors: number;
  }> {
    const results = {
      successful: 0,
      rateLimited: 0,
      errors: 0,
    };

    const promises: Promise<void>[] = [];
    for (let i = 0; i < count; i++) {
      promises.push(
        this.client.get(endpoint)
          .then(() => {
            results.successful++;
          })
          .catch((error: any) => {
            if (error.response?.status === 429) {
              results.rateLimited++;
            } else {
              results.errors++;
            }
          })
      );
    }

    await Promise.all(promises);
    return results;
  }

  /**
   * Test sustained load over time
   */
  async testSustained(
    endpoint: string,
    requestsPerSecond: number,
    durationSeconds: number
  ): Promise<{
    totalRequests: number;
    successful: number;
    rateLimited: number;
    errors: number;
  }> {
    const results = {
      totalRequests: 0,
      successful: 0,
      rateLimited: 0,
      errors: 0,
    };

    const intervalMs = 1000 / requestsPerSecond;
    const endTime = Date.now() + durationSeconds * 1000;

    while (Date.now() < endTime) {
      const start = Date.now();

      try {
        await this.client.get(endpoint);
        results.successful++;
      } catch (error: any) {
        if (error.response?.status === 429) {
          results.rateLimited++;
        } else {
          results.errors++;
        }
      }

      results.totalRequests++;

      // Wait for next interval
      const elapsed = Date.now() - start;
      const waitTime = Math.max(0, intervalMs - elapsed);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    return results;
  }
}

/**
 * Example Test Script
 */
export async function runExampleTests() {
  console.log('=== Unified Gateway Client Tests ===\n');

  // Test 1: INTERNAL_JWT authentication
  console.log('Test 1: INTERNAL_JWT Authentication');
  const { client: internalClient } = await TestClientFactory.createTestClient(
    'test-internal',
    'INTERNAL_JWT'
  );

  try {
    const response = await internalClient.get('/api/health');
    console.log('✅ INTERNAL_JWT auth successful');
    console.log(`Response: ${JSON.stringify(response.data)}\n`);
  } catch (error: any) {
    console.log(`❌ INTERNAL_JWT auth failed: ${error.message}\n`);
  }

  // Test 2: ENHANCED authentication
  console.log('Test 2: ENHANCED Authentication (JWT + HMAC)');
  const { client: enhancedClient } = await TestClientFactory.createTestClient(
    'test-enhanced',
    'ENHANCED'
  );

  try {
    const response = await enhancedClient.get('/api/health');
    console.log('✅ ENHANCED auth successful');
    console.log(`Response: ${JSON.stringify(response.data)}\n`);
  } catch (error: any) {
    console.log(`❌ ENHANCED auth failed: ${error.message}\n`);
  }

  // Test 3: Rate limiting
  console.log('Test 3: Rate Limiting (Burst)');
  const rateLimitTester = new RateLimitTester(internalClient);
  
  const burstResults = await rateLimitTester.testBurst('/api/health', 150);
  console.log(`✅ Burst test complete:`);
  console.log(`   Successful: ${burstResults.successful}`);
  console.log(`   Rate Limited: ${burstResults.rateLimited}`);
  console.log(`   Errors: ${burstResults.errors}\n`);

  console.log('=== Tests Complete ===');
}

// Run tests if executed directly
if (require.main === module) {
  runExampleTests().catch(console.error);
}

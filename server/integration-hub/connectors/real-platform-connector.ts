/**
 * ═══════════════════════════════════════════════════════════
 * Real Platform Connector
 * ═══════════════════════════════════════════════════════════
 * HTTP-based connector for SIDE nodes, Academy, and external platforms
 * Fetches code, pushes changes, creates PRs - REAL IMPLEMENTATION
 * Enhanced with checksum validation and binary file support
 * Professional implementation - Abu Sham Vision
 */

import { EventEmitter } from 'events';
import { processContent, restoreContent, type EncodedContent } from '../utils/crypto-utils';

export interface PlatformConnection {
  nucleusId: string;
  name: string;
  type: 'SIDE' | 'ACADEMY' | 'EXTERNAL';
  baseUrl: string;
  apiKey?: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  lastPing?: Date;
  metadata?: Record<string, any>;
}

export interface CodebaseFetchOptions {
  branch?: string;
  commitHash?: string;
  path?: string;
}

export interface CodeChange {
  file: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  content?: string;
  encoding?: 'utf-8' | 'base64'; // CRITICAL: API needs to know encoding type!
  reason: string;
}

export interface PullRequestOptions {
  title: string;
  description: string;
  branch: string;
  baseBranch?: string;
  changes: CodeChange[];
}

/**
 * Real Platform Connector
 * - Connects to SIDE nodes via HTTP
 * - Fetches code from repositories
 * - Pushes changes
 * - Creates Pull Requests
 */
export class RealPlatformConnector extends EventEmitter {
  private connections: Map<string, PlatformConnection> = new Map();
  private readonly timeout: number = 30000; // 30 seconds

  constructor() {
    super();
    console.log('[PlatformConnector] 🔌 Real Platform Connector initialized');
  }

  /**
   * ربط نواة
   * Connect to a nucleus
   */
  async connect(connection: Omit<PlatformConnection, 'status' | 'lastPing'>): Promise<void> {
    console.log(`[PlatformConnector] 🔗 Connecting to nucleus: ${connection.name}`);

    try {
      // Verify connection by pinging the nucleus
      const isHealthy = await this.ping(connection.baseUrl, connection.apiKey);
      
      if (!isHealthy) {
        throw new Error(`Failed to ping nucleus: ${connection.name}`);
      }

      this.connections.set(connection.nucleusId, {
        ...connection,
        status: 'CONNECTED',
        lastPing: new Date(),
      });

      console.log(`[PlatformConnector] ✅ Connected to nucleus: ${connection.name}`);
      this.emit('nucleus.connected', connection);
    } catch (error: any) {
      console.error(`[PlatformConnector] ❌ Failed to connect to ${connection.name}:`, error);
      
      this.connections.set(connection.nucleusId, {
        ...connection,
        status: 'ERROR',
      });

      throw error;
    }
  }

  /**
   * قطع الاتصال من نواة
   * Disconnect from nucleus
   */
  async disconnect(nucleusId: string): Promise<void> {
    const connection = this.connections.get(nucleusId);
    
    if (!connection) {
      throw new Error(`Nucleus not found: ${nucleusId}`);
    }

    console.log(`[PlatformConnector] 🔌 Disconnecting from nucleus: ${connection.name}`);
    
    this.connections.delete(nucleusId);
    this.emit('nucleus.disconnected', connection);
    
    console.log(`[PlatformConnector] ✅ Disconnected from nucleus: ${connection.name}`);
  }

  /**
   * جلب الكود من نواة
   * Fetch codebase from a nucleus (REAL HTTP IMPLEMENTATION)
   */
  async fetchCodebase(
    nucleusId: string, 
    repository: string, 
    options: CodebaseFetchOptions = {}
  ): Promise<any> {
    const connection = this.getConnection(nucleusId);
    
    console.log(`[PlatformConnector] 📥 Fetching codebase from: ${connection.name}`);
    console.log(`[PlatformConnector] 📦 Repository: ${repository}, Branch: ${options.branch || 'main'}`);

    try {
      // Build request URL
      const url = new URL(`${connection.baseUrl}/api/codebase/fetch`);
      url.searchParams.set('repository', repository);
      if (options.branch) url.searchParams.set('branch', options.branch);
      if (options.commitHash) url.searchParams.set('commit', options.commitHash);
      if (options.path) url.searchParams.set('path', options.path);

      // Make HTTP request
      const response = await this.makeRequest(url.toString(), {
        method: 'GET',
        headers: this.buildHeaders(connection),
      });

      console.log(`[PlatformConnector] ✅ Codebase fetched: ${response.totalFiles || 0} files`);
      
      return response;
    } catch (error: any) {
      console.error(`[PlatformConnector] ❌ Failed to fetch codebase:`, error);
      throw new Error(`Codebase fetch failed: ${error.message}`);
    }
  }

  /**
   * جلب ملف واحد من نواة
   * Fetch single file from nucleus (REAL HTTP IMPLEMENTATION)
   * Returns file content with checksum and encoding metadata
   */
  async fetchFile(
    nucleusId: string,
    repository: string,
    filePath: string,
    branch = 'main'
  ): Promise<EncodedContent> {
    const connection = this.getConnection(nucleusId);
    
    console.log(`[PlatformConnector] 📄 Fetching file: ${filePath} from ${connection.name}`);
    console.log(`[PlatformConnector] 📦 Repository: ${repository}, Branch: ${branch}`);

    try {
      const url = new URL(`${connection.baseUrl}/api/codebase/file`);
      url.searchParams.set('repository', repository);
      url.searchParams.set('file', filePath);
      url.searchParams.set('branch', branch);

      const response = await this.makeRequest(url.toString(), {
        method: 'GET',
        headers: this.buildHeaders(connection),
      });

      // Validate response schema - API MUST return { content: string }
      if (!response || typeof response.content !== 'string') {
        throw new Error(`Invalid API response: expected { content: string }, got ${JSON.stringify(response)}`);
      }

      // Verify content is not empty (unless file is legitimately empty)
      if (response.content.length === 0) {
        console.warn(`[PlatformConnector] ⚠️  File is empty: ${filePath}`);
      }

      // CRITICAL: Use encoding from API response if provided (don't re-detect!)
      // If API returns { content, encoding }, trust it (GitHub/GitLab pattern)
      // Otherwise detect encoding ourselves
      const apiEncoding = response.encoding as 'utf-8' | 'base64' | undefined;
      
      // Process content: calculate checksum, get size
      // IMPORTANT: Pass encoding from API to avoid re-detection
      const encodedContent = processContent(response.content, apiEncoding);

      console.log(
        `[PlatformConnector] ✅ File fetched: ${filePath} ` +
        `(${encodedContent.size} bytes, ${encodedContent.encoding}, checksum: ${encodedContent.checksum.substring(0, 8)}...)`
      );
      
      return encodedContent;
    } catch (error: any) {
      console.error(`[PlatformConnector] ❌ Failed to fetch file:`, error);
      throw new Error(`File fetch failed for ${filePath}: ${error.message}`);
    }
  }

  /**
   * دفع التغييرات إلى نواة
   * Push changes to a nucleus (REAL HTTP IMPLEMENTATION)
   */
  async pushChanges(
    nucleusId: string, 
    changes: CodeChange[], 
    commitMessage: string
  ): Promise<any> {
    const connection = this.getConnection(nucleusId);
    
    console.log(`[PlatformConnector] 📤 Pushing ${changes.length} changes to: ${connection.name}`);

    try {
      const url = `${connection.baseUrl}/api/codebase/push`;
      
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: this.buildHeaders(connection),
        body: JSON.stringify({
          changes,
          commitMessage,
          timestamp: new Date().toISOString(),
        }),
      });

      console.log(`[PlatformConnector] ✅ Changes pushed successfully`);
      
      return response;
    } catch (error: any) {
      console.error(`[PlatformConnector] ❌ Failed to push changes:`, error);
      throw new Error(`Push failed: ${error.message}`);
    }
  }

  /**
   * إنشاء Pull Request في نواة
   * Create a Pull Request (REAL HTTP IMPLEMENTATION)
   */
  async createPullRequest(
    nucleusId: string,
    options: PullRequestOptions
  ): Promise<{ prUrl: string; prId: string }> {
    const connection = this.getConnection(nucleusId);
    
    console.log(`[PlatformConnector] 📝 Creating PR in nucleus: ${connection.name}`);
    console.log(`[PlatformConnector] 🏷️  Title: ${options.title}`);

    try {
      const url = `${connection.baseUrl}/api/pull-request/create`;
      
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: this.buildHeaders(connection),
        body: JSON.stringify({
          title: options.title,
          description: options.description,
          branch: options.branch,
          baseBranch: options.baseBranch || 'main',
          changes: options.changes,
          timestamp: new Date().toISOString(),
        }),
      });

      const prUrl = response.prUrl || `${connection.baseUrl}/pull/${response.prId}`;
      const prId = response.prId || response.id;

      console.log(`[PlatformConnector] ✅ PR created: ${prUrl}`);

      return { prUrl, prId };
    } catch (error: any) {
      console.error(`[PlatformConnector] ❌ Failed to create PR:`, error);
      throw new Error(`PR creation failed: ${error.message}`);
    }
  }

  /**
   * فحص صحة الاتصال
   * Health check ping
   */
  async ping(baseUrl?: string, apiKey?: string): Promise<boolean> {
    try {
      const url = baseUrl ? `${baseUrl}/api/health` : '';
      
      if (!url) {
        console.warn('[PlatformConnector] ⚠️  No URL provided for ping');
        return false;
      }

      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
      });

      return response.status === 'healthy' || response.ok === true;
    } catch (error: any) {
      console.error(`[PlatformConnector] ❌ Ping failed:`, error);
      return false;
    }
  }

  /**
   * الحصول على حالة الاتصال
   * Get connection status
   */
  getConnectionStatus(nucleusId: string): PlatformConnection | null {
    return this.connections.get(nucleusId) || null;
  }

  /**
   * الحصول على جميع الاتصالات
   * Get all connections
   */
  getAllConnections(): PlatformConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Private: Get connection or throw
   */
  private getConnection(nucleusId: string): PlatformConnection {
    const connection = this.connections.get(nucleusId);
    
    if (!connection) {
      throw new Error(`Not connected to nucleus: ${nucleusId}`);
    }

    if (connection.status !== 'CONNECTED') {
      throw new Error(`Nucleus is not connected: ${connection.name} (${connection.status})`);
    }

    return connection;
  }

  /**
   * Private: Build authorization headers
   */
  private buildHeaders(connection: PlatformConnection): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Integration-Hub/1.0',
    };

    if (connection.apiKey) {
      headers['Authorization'] = `Bearer ${connection.apiKey}`;
    }

    return headers;
  }

  /**
   * Private: Make HTTP request with retry logic
   */
  private async makeRequest(
    url: string,
    options: RequestInit,
    retries: number = 2
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return { ok: true, status: response.status };
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }

      // Retry logic
      if (retries > 0) {
        console.log(`[PlatformConnector] 🔄 Retrying request (${retries} attempts left)...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return this.makeRequest(url, options, retries - 1);
      }

      throw error;
    }
  }

  /**
   * فحص صحة جميع الاتصالات
   * Health check all connections
   */
  async healthCheckAll(): Promise<void> {
    const connections = Array.from(this.connections.values());
    
    console.log(`[PlatformConnector] 💓 Health checking ${connections.length} connections...`);

    await Promise.allSettled(
      connections.map(async (connection) => {
        const isHealthy = await this.ping(connection.baseUrl, connection.apiKey);
        
        if (isHealthy) {
          connection.status = 'CONNECTED';
          connection.lastPing = new Date();
        } else {
          connection.status = 'ERROR';
        }

        this.connections.set(connection.nucleusId, connection);
      })
    );

    const healthy = connections.filter(c => c.status === 'CONNECTED').length;
    console.log(`[PlatformConnector] ✅ Health check complete: ${healthy}/${connections.length} healthy`);
  }
}

// Export singleton instance for use across the application
export const realPlatformConnector = new RealPlatformConnector();

/**
 * Nucleus Client SDK
 * 
 * Official TypeScript client for connecting to Nucleus 3.0 API Gateway
 * 
 * @example
 * ```typescript
 * const nucleus = new NucleusClient({
 *   platformId: 'codemaster',
 *   apiKey: process.env.CODEMASTER_API_KEY!,
 *   hmacSecret: process.env.CODEMASTER_HMAC_SECRET!,
 *   nucleusUrl: 'https://nucleus.replit.app'
 * });
 * 
 * const result = await nucleus.uil.analyze({
 *   content: 'Create a React login form',
 *   context: 'web development'
 * });
 * ```
 */

import crypto from 'crypto';

// ===== Types =====

export interface NucleusClientConfig {
  platformId: 'codemaster' | 'designer' | string;
  apiKey: string;
  hmacSecret: string;
  nucleusUrl: string;
  timeout?: number;
}

export interface NucleusResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  rateLimit?: {
    perMinute: number;
    perHour: number;
  };
}

export interface UILAnalyzeRequest {
  content: string;
  context?: string;
}

export interface UILPlanRequest {
  goal: string;
  constraints?: string[];
}

export interface UILCodeRequest {
  prompt: string;
  language?: string;
  framework?: string;
}

export interface UILChatRequest {
  message: string;
  history?: Array<{ role: string; content: string }>;
}

export interface UILSummarizeRequest {
  content: string;
  maxLength?: number;
}

export interface CodeGenerateRequest {
  prompt: string;
  language?: string;
  context?: Record<string, any>;
}

export interface DesignGenerateRequest {
  prompt: string;
  style?: string;
  components?: string[];
}

export interface IntelligenceAnalyzeRequest {
  content: string;
  analysisType?: string;
}

export interface MemoryRetrieveRequest {
  query: string;
  limit?: number;
}

export class NucleusError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public rateLimit?: { perMinute: number; perHour: number }
  ) {
    super(message);
    this.name = 'NucleusError';
  }
}

// ===== Client =====

export class NucleusClient {
  private config: Required<NucleusClientConfig>;

  constructor(config: NucleusClientConfig) {
    this.config = {
      ...config,
      timeout: config.timeout || 30000
    };
  }

  /**
   * Generate HMAC signature for request
   */
  private generateSignature(payload: any, timestamp: string): string {
    const data = JSON.stringify(payload) + timestamp;
    return crypto
      .createHmac('sha256', this.config.hmacSecret)
      .update(data)
      .digest('hex');
  }

  /**
   * Make authenticated request to Nucleus
   */
  private async request<T = any>(
    endpoint: string,
    body: any,
    method: 'GET' | 'POST' = 'POST'
  ): Promise<NucleusResponse<T>> {
    const timestamp = Date.now().toString();
    const signature = this.generateSignature(body, timestamp);

    const url = `${this.config.nucleusUrl}/api${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'x-platform-id': this.config.platformId,
          'x-timestamp': timestamp,
          'x-signature': signature
        },
        body: method === 'POST' ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      if (!response.ok) {
        throw new NucleusError(
          result.error || 'Request failed',
          response.status,
          result.remaining
        );
      }

      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new NucleusError('Request timeout');
      }
      
      if (error instanceof NucleusError) {
        throw error;
      }
      
      throw new NucleusError(error.message || 'Network error');
    }
  }

  /**
   * UIL (Unified Intelligence Layer) methods
   */
  public uil = {
    /**
     * Analyze content with AI
     */
    analyze: async (request: UILAnalyzeRequest) => {
      return this.request('/uil/analyze', request);
    },

    /**
     * Create execution plan
     */
    plan: async (request: UILPlanRequest) => {
      return this.request('/uil/plan', request);
    },

    /**
     * Generate code
     */
    code: async (request: UILCodeRequest) => {
      return this.request('/uil/code', request);
    },

    /**
     * Chat with AI
     */
    chat: async (request: UILChatRequest) => {
      return this.request('/uil/chat', request);
    },

    /**
     * Summarize content
     */
    summarize: async (request: UILSummarizeRequest) => {
      return this.request('/uil/summarize', request);
    }
  };

  /**
   * Platform-specific methods
   */
  public platform = {
    /**
     * Generate code (CodeMaster only)
     */
    generateCode: async (request: CodeGenerateRequest) => {
      if (this.config.platformId !== 'codemaster') {
        throw new NucleusError('This method is only available for CodeMaster platform');
      }
      return this.request('/gateway/code/generate', request);
    },

    /**
     * Generate design (Designer only)
     */
    generateDesign: async (request: DesignGenerateRequest) => {
      if (this.config.platformId !== 'designer') {
        throw new NucleusError('This method is only available for Designer platform');
      }
      return this.request('/gateway/design/generate', request);
    }
  };

  /**
   * Intelligence methods
   */
  public intelligence = {
    /**
     * Analyze with intelligence system
     */
    analyze: async (request: IntelligenceAnalyzeRequest) => {
      return this.request('/intelligence/analyze', request);
    }
  };

  /**
   * Memory methods
   */
  public memory = {
    /**
     * Retrieve from memory
     */
    retrieve: async (request: MemoryRetrieveRequest) => {
      return this.request('/memory/retrieve', request);
    }
  };

  /**
   * Health check
   */
  public async healthCheck() {
    const url = `${this.config.nucleusUrl}/api/gateway/health`;
    const response = await fetch(url);
    return response.json();
  }

  /**
   * Get platform info
   */
  public async getPlatformInfo() {
    return this.request('/gateway/platform/info', {}, 'POST');
  }
}

// ===== Factory Functions =====

/**
 * Create CodeMaster client
 */
export function createCodeMasterClient(config: Omit<NucleusClientConfig, 'platformId'>) {
  return new NucleusClient({
    ...config,
    platformId: 'codemaster'
  });
}

/**
 * Create Designer client
 */
export function createDesignerClient(config: Omit<NucleusClientConfig, 'platformId'>) {
  return new NucleusClient({
    ...config,
    platformId: 'designer'
  });
}

// ===== Export Default =====

export default NucleusClient;

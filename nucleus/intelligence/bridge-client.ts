/**
 * Surooh AI Provider Bridge Client
 * Connects Nucleus AI Committee with Python Bridge (Adaptive Mode)
 * 
 * Features:
 * - Adaptive routing: auto-selects best provider based on task type
 * - Auto committee: triggers multi-model voting on sensitive tasks
 * - Auto distribution: broadcasts insights to all platforms via UKB
 */

interface BridgeConfig {
  enabled: boolean;
  url: string;
  timeout: number;
  fallbackToCommittee: boolean;
}

interface BridgeMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface BridgeRequest {
  messages: BridgeMessage[];
  max_tokens?: number;
  temperature?: number;
  task_id?: string;
}

interface BridgeResponse {
  choices?: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
  content?: Array<{
    text: string;
  }>;
  error?: string;
}

export class BridgeClient {
  private config: BridgeConfig;

  constructor(config?: Partial<BridgeConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      url: config?.url ?? (process.env.AI_BRIDGE_URL || 'http://127.0.0.1:7010'),
      timeout: config?.timeout ?? 60000,
      fallbackToCommittee: config?.fallbackToCommittee ?? true
    };
  }

  /**
   * Send request to AI Bridge (OpenAI-compatible endpoint)
   */
  async complete(prompt: string, options?: {
    taskType?: 'analysis' | 'conversation' | 'summarization' | 'planning' | 'coding';
    maxTokens?: number;
    temperature?: number;
    taskId?: string;
  }): Promise<{
    success: boolean;
    response?: string;
    provider?: string;
    error?: string;
  }> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: 'Bridge is disabled'
      };
    }

    const messages: BridgeMessage[] = [
      { role: 'user', content: prompt }
    ];

    // Add task type hint if provided
    if (options?.taskType) {
      messages.unshift({
        role: 'system',
        content: `Task type: ${options.taskType}. Please provide the most appropriate response.`
      });
    }

    const request: BridgeRequest = {
      messages,
      max_tokens: options?.maxTokens ?? 1024,
      temperature: options?.temperature ?? 0.7,
      task_id: options?.taskId
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.url}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Bridge error: ${response.status} ${response.statusText}`);
      }

      const data: BridgeResponse = await response.json();

      // Handle OpenAI-compatible response
      if (data.choices && data.choices.length > 0) {
        return {
          success: true,
          response: data.choices[0].message.content,
          provider: 'bridge-adaptive'
        };
      }

      // Handle Anthropic-style response
      if (data.content && data.content.length > 0) {
        return {
          success: true,
          response: data.content[0].text,
          provider: 'bridge-anthropic'
        };
      }

      if (data.error) {
        throw new Error(data.error);
      }

      throw new Error('Invalid response format from bridge');

    } catch (error: any) {
      console.error('[BridgeClient] Error:', error.message);
      
      return {
        success: false,
        error: error.message || 'Bridge request failed'
      };
    }
  }

  /**
   * Send request to Claude via Bridge (Anthropic endpoint)
   */
  async completeClaude(prompt: string, options?: {
    maxTokens?: number;
    temperature?: number;
  }): Promise<{
    success: boolean;
    response?: string;
    error?: string;
  }> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: 'Bridge is disabled'
      };
    }

    const messages: BridgeMessage[] = [
      { role: 'user', content: prompt }
    ];

    const request: BridgeRequest = {
      messages,
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.7
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.url}/v1/anthropic/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Claude bridge error: ${response.status} ${response.statusText}`);
      }

      const data: BridgeResponse = await response.json();

      if (data.content && data.content.length > 0) {
        return {
          success: true,
          response: data.content[0].text
        };
      }

      if (data.error) {
        throw new Error(data.error);
      }

      throw new Error('Invalid response from Claude bridge');

    } catch (error: any) {
      console.error('[BridgeClient] Claude Error:', error.message);
      
      return {
        success: false,
        error: error.message || 'Claude bridge request failed'
      };
    }
  }

  /**
   * Check bridge health
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    mode?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.config.url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        return {
          healthy: false,
          error: `HTTP ${response.status}`
        };
      }

      const data = await response.json();
      
      return {
        healthy: data.status === 'ok',
        mode: data.mode
      };

    } catch (error: any) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }
}

// Singleton instance
export const bridgeClient = new BridgeClient();

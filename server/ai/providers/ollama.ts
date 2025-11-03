import OpenAI from 'openai';

export class OllamaProvider {
  private client: OpenAI;
  private model: string = 'llama3.3:70b';
  private baseURL: string;

  constructor(baseURL?: string, model?: string) {
    // Remove /v1 suffix if present - we'll use native Ollama API
    const url = baseURL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.baseURL = url.replace(/\/v1$/, '');
    if (model) this.model = model;
    
    // Ollama uses OpenAI-compatible API
    this.client = new OpenAI({
      apiKey: 'ollama', // Ollama doesn't need API key, but OpenAI client requires it
      baseURL: this.baseURL,
    });
  }

  async chat(messages: Array<{ role: string; content: string }>, options?: {
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
  }) {
    const {
      maxTokens = 4096,
      temperature = 0.7,
      stream = false
    } = options || {};

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages as any,
        max_tokens: maxTokens,
        temperature,
        stream
      });

      if (stream) {
        return response; // Return stream directly
      }

      return {
        content: (response as any).choices[0]?.message?.content || '',
        model: this.model,
        usage: (response as any).usage,
        finishReason: (response as any).choices[0]?.finish_reason
      };
    } catch (error: any) {
      console.error('[Ollama] Error:', error.message);
      throw new Error(`Ollama API error: ${error.message}`);
    }
  }

  async generateResponse(prompt: string, options?: {
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<string> {
    // Build full prompt with system message if provided
    let fullPrompt = prompt;
    if (options?.systemPrompt) {
      fullPrompt = `${options.systemPrompt}\n\n${prompt}`;
    }

    // Use native Ollama API for better compatibility
    return await this.generate(fullPrompt, {
      maxTokens: options?.maxTokens,
      temperature: options?.temperature
    });
  }

  async generate(prompt: string, options?: {
    maxTokens?: number;
    temperature?: number;
  }): Promise<string> {
    // Direct generate endpoint (Ollama-specific, not OpenAI compatible)
    try {
      const response = await fetch(`${this.baseURL.replace('/v1', '')}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            num_predict: options?.maxTokens || 4096,
            temperature: options?.temperature || 0.7
          }
        }),
        signal: AbortSignal.timeout(120000) // 2 minutes timeout for generation
      });

      if (!response.ok) {
        throw new Error(`Ollama generate failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response || '';
    } catch (error: any) {
      console.error('[Ollama] Generate error:', error.message);
      throw new Error(`Ollama generate error: ${error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL.replace('/v1', '')}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(30000) // 30s timeout (first load)
      });
      return response.ok;
    } catch (error) {
      console.error('[Ollama] Health check failed:', error);
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseURL.replace('/v1', '')}/api/tags`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.error('[Ollama] List models error:', error);
      return [];
    }
  }

  getModelInfo() {
    return {
      name: 'Llama 3.3 70B (Q4)',
      provider: 'Self-hosted (Ollama)',
      type: 'Open-Source LLM',
      parameters: '70B (quantized to Q4)',
      contextWindow: '128K tokens',
      features: [
        'Self-hosted on dedicated GPU',
        '100% private and secure',
        'Unlimited usage (no API costs)',
        'Arabic & English support',
        'Fast inference with GPU acceleration'
      ],
      deployment: {
        location: 'RunPod GPU Server',
        endpoint: this.baseURL,
        model: this.model
      }
    };
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  getModel(): string {
    return this.model;
  }
}

// Singleton instance
export const ollamaProvider = new OllamaProvider();

export default OllamaProvider;

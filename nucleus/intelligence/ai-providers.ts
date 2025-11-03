/**
 * Nucleus 3.0 - AI Providers Module
 * Unified interface for 6 AI models: Hunyuan, OpenAI, Claude, Llama, Mistral, Falcon
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import axios from 'axios';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface AIResponse {
  model: string;
  content: string;
  reasoning?: string;
  confidence?: number;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AIProvider {
  name: string;
  model: string;
  generate(prompt: string, options?: GenerateOptions): Promise<AIResponse>;
}

export interface GenerateOptions {
  temperature?: number;
  max_tokens?: number;
  system_prompt?: string;
  stream?: boolean;
}

// ============================================================================
// 1. Hunyuan Provider (Existing - SiliconFlow)
// ============================================================================

export class HunyuanProvider implements AIProvider {
  name = 'Hunyuan-A13B';
  model = 'Tencent-Hunyuan/Hunyuan-A13B-Instruct';
  private apiKey: string;
  private baseURL = 'https://api.siliconflow.cn/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<AIResponse> {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            ...(options.system_prompt ? [{ role: 'system', content: options.system_prompt }] : []),
            { role: 'user', content: prompt }
          ],
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 2000,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      return {
        model: this.model,
        content,
        usage: response.data.usage
      };
    } catch (error: any) {
      console.error('[HunyuanProvider] Error:', error.response?.data || error.message);
      throw new Error(`Hunyuan API error: ${error.message}`);
    }
  }
}

// ============================================================================
// 2. OpenAI Provider (Existing)
// ============================================================================

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI';
  model = 'gpt-4o-mini';
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<AIResponse> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          ...(options.system_prompt ? [{ role: 'system' as const, content: options.system_prompt }] : []),
          { role: 'user' as const, content: prompt }
        ],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 2000
      });

      return {
        model: this.model,
        content: completion.choices[0].message.content || '',
        usage: {
          prompt_tokens: completion.usage?.prompt_tokens || 0,
          completion_tokens: completion.usage?.completion_tokens || 0,
          total_tokens: completion.usage?.total_tokens || 0
        }
      };
    } catch (error: any) {
      console.error('[OpenAIProvider] Error:', error.message);
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }
}

// ============================================================================
// 3. Claude Provider (Anthropic) - NEW
// ============================================================================

export class ClaudeProvider implements AIProvider {
  name = 'Claude';
  model = 'claude-3-5-sonnet-20241022';
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<AIResponse> {
    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: options.max_tokens ?? 2000,
        temperature: options.temperature ?? 0.7,
        system: options.system_prompt,
        messages: [
          { role: 'user', content: prompt }
        ]
      });

      const content = message.content[0].type === 'text' ? message.content[0].text : '';

      return {
        model: this.model,
        content,
        usage: {
          prompt_tokens: message.usage.input_tokens,
          completion_tokens: message.usage.output_tokens,
          total_tokens: message.usage.input_tokens + message.usage.output_tokens
        }
      };
    } catch (error: any) {
      console.error('[ClaudeProvider] Error:', error.message);
      throw new Error(`Claude API error: ${error.message}`);
    }
  }
}

// ============================================================================
// 4. Llama Provider (via Groq) - NEW
// ============================================================================

export class LlamaProvider implements AIProvider {
  name = 'Llama-3.1';
  model = 'llama-3.3-70b-versatile';
  private apiKey: string;
  private baseURL = 'https://api.groq.com/openai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<AIResponse> {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            ...(options.system_prompt ? [{ role: 'system', content: options.system_prompt }] : []),
            { role: 'user', content: prompt }
          ],
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        model: this.model,
        content: response.data.choices[0].message.content,
        usage: response.data.usage
      };
    } catch (error: any) {
      console.error('[LlamaProvider] Error:', error.response?.data || error.message);
      throw new Error(`Llama (Groq) API error: ${error.message}`);
    }
  }
}

// ============================================================================
// 5. Mistral Provider (via Mistral AI) - NEW
// ============================================================================

export class MistralProvider implements AIProvider {
  name = 'Mistral';
  model = 'mistral-large-latest';
  private apiKey: string;
  private baseURL = 'https://api.mistral.ai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<AIResponse> {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            ...(options.system_prompt ? [{ role: 'system', content: options.system_prompt }] : []),
            { role: 'user', content: prompt }
          ],
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        model: this.model,
        content: response.data.choices[0].message.content,
        usage: response.data.usage
      };
    } catch (error: any) {
      console.error('[MistralProvider] Error:', error.response?.data || error.message);
      throw new Error(`Mistral API error: ${error.message}`);
    }
  }
}

// ============================================================================
// 6. Falcon Provider (via HuggingFace Inference) - NEW
// ============================================================================

export class FalconProvider implements AIProvider {
  name = 'Falcon';
  model = 'tiiuae/falcon-7b-instruct';
  private apiKey: string;
  private baseURL = 'https://api-inference.huggingface.co/models';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<AIResponse> {
    try {
      const systemPrompt = options.system_prompt ? `${options.system_prompt}\n\n` : '';
      const fullPrompt = `${systemPrompt}${prompt}`;

      const response = await axios.post(
        `${this.baseURL}/${this.model}`,
        {
          inputs: fullPrompt,
          parameters: {
            temperature: options.temperature ?? 0.7,
            max_new_tokens: options.max_tokens ?? 2000,
            return_full_text: false
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = Array.isArray(response.data) 
        ? response.data[0]?.generated_text 
        : response.data.generated_text || '';

      return {
        model: this.model,
        content: content.trim()
      };
    } catch (error: any) {
      console.error('[FalconProvider] Error:', error.response?.data || error.message);
      throw new Error(`Falcon (HuggingFace) API error: ${error.message}`);
    }
  }
}

// ============================================================================
// 7. OpenRouter Provider (Llama 3.3 70B - Free!) - NEW
// ============================================================================

export class OpenRouterProvider implements AIProvider {
  name = 'Llama-OpenRouter';
  model = 'meta-llama/llama-3.3-70b-instruct:free';
  private apiKey: string;
  private baseURL = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<AIResponse> {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            ...(options.system_prompt ? [{ role: 'system', content: options.system_prompt }] : []),
            { role: 'user', content: prompt }
          ],
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://nicholas-surooh.replit.app',
            'X-Title': 'Nicholas 3.2 - Surooh Empire'
          }
        }
      );

      return {
        model: this.model,
        content: response.data.choices[0].message.content,
        usage: response.data.usage
      };
    } catch (error: any) {
      console.error('[OpenRouterProvider] Error:', error.response?.data || error.message);
      throw new Error(`OpenRouter API error: ${error.message}`);
    }
  }
}

// ============================================================================
// 8. DeepSeek R1 via OpenRouter (Free!) - Reasoning Model
// ============================================================================

export class DeepSeekR1Provider implements AIProvider {
  name = 'DeepSeek-R1';
  model = 'deepseek/deepseek-r1:free';
  private apiKey: string;
  private baseURL = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<AIResponse> {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            ...(options.system_prompt ? [{ role: 'system', content: options.system_prompt }] : []),
            { role: 'user', content: prompt }
          ],
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://nicholas-surooh.replit.app',
            'X-Title': 'Nicholas 3.2 - Surooh Empire'
          }
        }
      );

      return {
        model: this.model,
        content: response.data.choices[0].message.content,
        usage: response.data.usage
      };
    } catch (error: any) {
      console.error('[DeepSeekR1Provider] Error:', error.response?.data || error.message);
      throw new Error(`DeepSeek R1 (OpenRouter) API error: ${error.message}`);
    }
  }
}

// ============================================================================
// 9. DeepSeek V3.1 via OpenRouter (Free!) - Chat Model
// ============================================================================

export class DeepSeekProvider implements AIProvider {
  name = 'DeepSeek-V3';
  model = 'deepseek/deepseek-chat-v3.1:free';
  private apiKey: string;
  private baseURL = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<AIResponse> {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            ...(options.system_prompt ? [{ role: 'system', content: options.system_prompt }] : []),
            { role: 'user', content: prompt }
          ],
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://nicholas-surooh.replit.app',
            'X-Title': 'Nicholas 3.2 - Surooh Empire'
          }
        }
      );

      return {
        model: this.model,
        content: response.data.choices[0].message.content,
        usage: response.data.usage
      };
    } catch (error: any) {
      console.error('[DeepSeekProvider] Error:', error.response?.data || error.message);
      throw new Error(`DeepSeek V3 (OpenRouter) API error: ${error.message}`);
    }
  }
}

// ============================================================================
// 10. Qwen 3 Coder via OpenRouter (Free!) - Coding Expert
// ============================================================================

export class QwenCoderProvider implements AIProvider {
  name = 'Qwen-Coder';
  model = 'qwen/qwen3-coder:free';
  private apiKey: string;
  private baseURL = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<AIResponse> {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            ...(options.system_prompt ? [{ role: 'system', content: options.system_prompt }] : []),
            { role: 'user', content: prompt }
          ],
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://nicholas-surooh.replit.app',
            'X-Title': 'Nicholas 3.2 - Surooh Empire'
          }
        }
      );

      return {
        model: this.model,
        content: response.data.choices[0].message.content,
        usage: response.data.usage
      };
    } catch (error: any) {
      console.error('[QwenCoderProvider] Error:', error.response?.data || error.message);
      throw new Error(`Qwen Coder (OpenRouter) API error: ${error.message}`);
    }
  }
}

// ============================================================================
// 11. Mistral Small via OpenRouter (Free!)
// ============================================================================

export class MistralSmallProvider implements AIProvider {
  name = 'Mistral-Small';
  model = 'mistralai/mistral-small-3.1-24b-instruct:free';
  private apiKey: string;
  private baseURL = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<AIResponse> {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            ...(options.system_prompt ? [{ role: 'system', content: options.system_prompt }] : []),
            { role: 'user', content: prompt }
          ],
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://nicholas-surooh.replit.app',
            'X-Title': 'Nicholas 3.2 - Surooh Empire'
          }
        }
      );

      return {
        model: this.model,
        content: response.data.choices[0].message.content,
        usage: response.data.usage
      };
    } catch (error: any) {
      console.error('[MistralSmallProvider] Error:', error.response?.data || error.message);
      throw new Error(`Mistral Small (OpenRouter) API error: ${error.message}`);
    }
  }
}

// ============================================================================
// AI Providers Manager
// ============================================================================

export class AIProvidersManager {
  private providers: Map<string, AIProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // 1. Hunyuan (SiliconFlow)
    if (process.env.SILICONFLOW_API_KEY) {
      this.providers.set('hunyuan', new HunyuanProvider(process.env.SILICONFLOW_API_KEY));
    }

    // 2. OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.providers.set('openai', new OpenAIProvider(process.env.OPENAI_API_KEY));
    }

    // 3. Claude (Anthropic)
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.set('claude', new ClaudeProvider(process.env.ANTHROPIC_API_KEY));
    }

    // 4. Llama (Groq)
    if (process.env.GROQ_API_KEY) {
      this.providers.set('llama-groq', new LlamaProvider(process.env.GROQ_API_KEY));
    }

    // 5. Mistral
    if (process.env.MISTRAL_API_KEY) {
      this.providers.set('mistral', new MistralProvider(process.env.MISTRAL_API_KEY));
    }

    // 6. Falcon (HuggingFace)
    if (process.env.HF_TOKEN) {
      this.providers.set('falcon', new FalconProvider(process.env.HF_TOKEN));
    }

    // 7. OpenRouter (Llama 3.3 70B - Free!)
    if (process.env.OPENROUTER_API_KEY) {
      this.providers.set('llama', new OpenRouterProvider(process.env.OPENROUTER_API_KEY));
    }

    // 8. DeepSeek R1 (OpenRouter - Free!)
    if (process.env.OPENROUTER_API_KEY) {
      this.providers.set('deepseek-r1', new DeepSeekR1Provider(process.env.OPENROUTER_API_KEY));
    }

    // 9. DeepSeek V3 (OpenRouter - Free!)
    if (process.env.OPENROUTER_API_KEY) {
      this.providers.set('deepseek', new DeepSeekProvider(process.env.OPENROUTER_API_KEY));
    }

    // 10. Qwen Coder (OpenRouter - Free!)
    if (process.env.OPENROUTER_API_KEY) {
      this.providers.set('qwen-coder', new QwenCoderProvider(process.env.OPENROUTER_API_KEY));
    }

    // 11. Mistral Small (OpenRouter - Free!)
    if (process.env.OPENROUTER_API_KEY) {
      this.providers.set('mistral-small', new MistralSmallProvider(process.env.OPENROUTER_API_KEY));
    }
  }

  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async generate(providerName: string, prompt: string, options?: GenerateOptions): Promise<AIResponse> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider "${providerName}" not found or not configured`);
    }
    return provider.generate(prompt, options);
  }
}

// Singleton instance
export const aiProviders = new AIProvidersManager();

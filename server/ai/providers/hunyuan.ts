import OpenAI from 'openai';

export class HunyuanProvider {
  private client: OpenAI;
  private model: string = 'tencent/Hunyuan-A13B-Instruct';

  constructor(apiKey?: string) {
    const key = apiKey || process.env.SILICONFLOW_API_KEY;
    
    if (!key) {
      throw new Error('SILICONFLOW_API_KEY is required for Hunyuan');
    }

    this.client = new OpenAI({
      apiKey: key,
      baseURL: 'https://api.siliconflow.com/v1',
    });
  }

  async chat(messages: Array<{ role: string; content: string }>, options?: {
    maxTokens?: number;
    temperature?: number;
    thinkingBudget?: number;
  }) {
    const {
      maxTokens = 4096,
      temperature = 0.7,
      thinkingBudget = 1024
    } = options || {};

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages as any,
        max_tokens: maxTokens,
        temperature,
        stream: false
      } as any);

      return {
        content: response.choices[0]?.message?.content || '',
        model: this.model,
        usage: response.usage,
        finishReason: response.choices[0]?.finish_reason
      };
    } catch (error: any) {
      console.error('[Hunyuan] Error:', error.message);
      throw new Error(`Hunyuan API error: ${error.message}`);
    }
  }

  async generateResponse(prompt: string, options?: {
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
    thinkingBudget?: number;
  }): Promise<string> {
    const messages: Array<{ role: string; content: string }> = [];
    
    if (options?.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt
      });
    }

    messages.push({
      role: 'user',
      content: prompt
    });

    const response = await this.chat(messages, {
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
      thinkingBudget: options?.thinkingBudget
    });

    return response.content;
  }

  getModelInfo() {
    return {
      name: 'Hunyuan-A13B',
      provider: 'Tencent (via SiliconFlow)',
      type: 'MoE (Mixture-of-Experts)',
      parameters: '80B total, 13B active',
      contextWindow: '128K tokens (256K available)',
      features: [
        'Dual-mode reasoning (fast/slow)',
        'Advanced agent capabilities',
        'Long-context understanding',
        'Multilingual support (29+ languages)'
      ],
      pricing: {
        input: '$0.14 per million tokens',
        output: '$0.57 per million tokens'
      }
    };
  }
}

export default HunyuanProvider;

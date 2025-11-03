/**
 * AI Configuration & Validation
 * التحقق من صحة مفاتيح الذكاء الاصطناعي
 */

export interface AIConfig {
  openai: {
    apiKey: string | null;
    enabled: boolean;
  };
  anthropic: {
    apiKey: string | null;
    enabled: boolean;
  };
  deepseek: {
    apiKey: string | null;
    enabled: boolean;
  };
}

export function validateAIConfig(): AIConfig {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;

  return {
    openai: {
      apiKey: openaiKey || null,
      enabled: !!openaiKey
    },
    anthropic: {
      apiKey: anthropicKey || null,
      enabled: !!anthropicKey
    },
    deepseek: {
      apiKey: deepseekKey || null,
      enabled: !!deepseekKey
    }
  };
}

export function checkAIAvailability(requiredServices?: 'openai' | 'anthropic' | 'both'): {
  available: boolean;
  message: string;
  config: AIConfig;
} {
  const config = validateAIConfig();
  const required = requiredServices || 'openai'; // Default to openai only

  if (!config.openai.enabled && !config.anthropic.enabled) {
    return {
      available: false,
      message: "AI services not available: Missing OPENAI_API_KEY and ANTHROPIC_API_KEY",
      config
    };
  }

  if (required === 'openai' && !config.openai.enabled) {
    return {
      available: false,
      message: "OpenAI service not available: Missing OPENAI_API_KEY",
      config
    };
  }

  if (required === 'anthropic' && !config.anthropic.enabled) {
    return {
      available: false,
      message: "Anthropic service not available: Missing ANTHROPIC_API_KEY",
      config
    };
  }

  if (required === 'both' && (!config.openai.enabled || !config.anthropic.enabled)) {
    const missing = [];
    if (!config.openai.enabled) missing.push('OPENAI_API_KEY');
    if (!config.anthropic.enabled) missing.push('ANTHROPIC_API_KEY');
    return {
      available: false,
      message: `AI services incomplete: Missing ${missing.join(' and ')}`,
      config
    };
  }

  return {
    available: true,
    message: required === 'both' ? "All AI services available" : `${required} service available`,
    config
  };
}

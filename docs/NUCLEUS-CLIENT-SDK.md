# Nucleus Client SDK

## Overview

Official Node.js/TypeScript SDK for connecting external platforms to Nucleus 3.0.

## Installation

Copy the `nucleus-client.ts` file to your project:

```bash
# In your platform (CodeMaster/Designer)
cp nucleus-client.ts src/lib/
```

## Quick Start

```typescript
import { NucleusClient } from './lib/nucleus-client';

// Initialize client
const nucleus = new NucleusClient({
  platformId: 'codemaster',
  apiKey: process.env.CODEMASTER_API_KEY!,
  hmacSecret: process.env.CODEMASTER_HMAC_SECRET!,
  nucleusUrl: process.env.NUCLEUS_URL || 'https://nucleus.replit.app'
});

// Use UIL
const result = await nucleus.uil.analyze({
  content: 'Build a React login form',
  context: 'web development'
});

console.log(result);
```

## Configuration

### Environment Variables

```bash
# .env
CODEMASTER_API_KEY=your_api_key_here
CODEMASTER_HMAC_SECRET=your_hmac_secret_here
NUCLEUS_URL=https://nucleus.replit.app
```

### Platform IDs

- `codemaster` - CodeMaster Platform
- `designer` - Designer Pro Platform

## API Methods

### UIL (Unified Intelligence Layer)

#### analyze()

Analyze input and provide intelligent insights.

```typescript
const result = await nucleus.uil.analyze({
  content: 'Create a dashboard with charts',
  context: 'react application'
});
```

#### plan()

Create execution plan for complex tasks.

```typescript
const result = await nucleus.uil.plan({
  goal: 'Build authentication system',
  constraints: ['use JWT', 'secure password storage']
});
```

#### code()

Generate code with AI assistance.

```typescript
const result = await nucleus.uil.code({
  prompt: 'Create a React component for user profile',
  language: 'typescript',
  framework: 'react'
});
```

#### chat()

Conversational AI interface.

```typescript
const result = await nucleus.uil.chat({
  message: 'How do I implement authentication?',
  history: previousMessages
});
```

#### summarize()

Summarize content intelligently.

```typescript
const result = await nucleus.uil.summarize({
  content: longDocument,
  maxLength: 500
});
```

### Platform-Specific Methods

#### CodeMaster: generateCode()

```typescript
const result = await nucleus.platform.generateCode({
  prompt: 'Create a login form',
  language: 'typescript',
  context: {
    framework: 'react',
    styling: 'tailwind'
  }
});
```

#### Designer: generateDesign()

```typescript
const result = await nucleus.platform.generateDesign({
  prompt: 'Modern dashboard UI',
  style: 'modern',
  components: ['header', 'sidebar', 'main']
});
```

### Intelligence Methods

#### analyze()

Get AI analysis of any content.

```typescript
const result = await nucleus.intelligence.analyze({
  content: codeSnippet,
  analysisType: 'code_quality'
});
```

### Memory Methods

#### retrieve()

Retrieve from Nucleus memory.

```typescript
const result = await nucleus.memory.retrieve({
  query: 'authentication patterns',
  limit: 10
});
```

## Error Handling

```typescript
try {
  const result = await nucleus.uil.analyze({...});
} catch (error) {
  if (error.statusCode === 401) {
    console.error('Authentication failed');
  } else if (error.statusCode === 429) {
    console.error('Rate limit exceeded:', error.rateLimit);
  } else {
    console.error('Error:', error.message);
  }
}
```

## Rate Limiting

The SDK automatically tracks rate limits:

```typescript
const result = await nucleus.uil.analyze({...});

console.log('Rate Limit Status:');
console.log('- Per Minute:', result.rateLimit?.perMinute);
console.log('- Per Hour:', result.rateLimit?.perHour);
```

## Advanced Usage

### Custom Timeout

```typescript
const nucleus = new NucleusClient({
  platformId: 'codemaster',
  apiKey: process.env.CODEMASTER_API_KEY!,
  hmacSecret: process.env.CODEMASTER_HMAC_SECRET!,
  nucleusUrl: process.env.NUCLEUS_URL!,
  timeout: 30000 // 30 seconds
});
```

### Retry Logic

```typescript
async function callWithRetry(fn: () => Promise<any>, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      if (error.statusCode === 429) {
        // Wait before retry on rate limit
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
      }
    }
  }
}

const result = await callWithRetry(() => 
  nucleus.uil.analyze({...})
);
```

### Batch Requests

```typescript
const results = await Promise.all([
  nucleus.uil.analyze({ content: 'task 1' }),
  nucleus.uil.analyze({ content: 'task 2' }),
  nucleus.uil.analyze({ content: 'task 3' })
]);
```

## TypeScript Support

Full TypeScript support with type definitions:

```typescript
import { 
  NucleusClient,
  UILAnalyzeRequest,
  UILAnalyzeResponse,
  NucleusError
} from './lib/nucleus-client';

const request: UILAnalyzeRequest = {
  content: 'test',
  context: 'development'
};

const response: UILAnalyzeResponse = await nucleus.uil.analyze(request);
```

## Examples

### CodeMaster Integration

```typescript
// src/services/nucleus.ts
import { NucleusClient } from '../lib/nucleus-client';

export const nucleus = new NucleusClient({
  platformId: 'codemaster',
  apiKey: process.env.CODEMASTER_API_KEY!,
  hmacSecret: process.env.CODEMASTER_HMAC_SECRET!,
  nucleusUrl: process.env.NUCLEUS_URL!
});

// Usage in editor
import { nucleus } from './services/nucleus';

async function analyzeCode(code: string) {
  const result = await nucleus.intelligence.analyze({
    content: code,
    analysisType: 'code_quality'
  });
  
  return result.analysis;
}
```

### Designer Integration

```typescript
// src/services/nucleus.ts
import { NucleusClient } from '../lib/nucleus-client';

export const nucleus = new NucleusClient({
  platformId: 'designer',
  apiKey: process.env.DESIGNER_API_KEY!,
  hmacSecret: process.env.DESIGNER_HMAC_SECRET!,
  nucleusUrl: process.env.NUCLEUS_URL!
});

// Usage in design tool
import { nucleus } from './services/nucleus';

async function generateDesignSuggestions(prompt: string) {
  const result = await nucleus.platform.generateDesign({
    prompt,
    style: 'modern',
    components: []
  });
  
  return result.design;
}
```

## Best Practices

### 1. Environment Configuration

```typescript
// config/nucleus.ts
export const nucleusConfig = {
  platformId: process.env.PLATFORM_ID!,
  apiKey: process.env.NUCLEUS_API_KEY!,
  hmacSecret: process.env.NUCLEUS_HMAC_SECRET!,
  nucleusUrl: process.env.NUCLEUS_URL!
};

// Validate on startup
if (!nucleusConfig.apiKey || !nucleusConfig.hmacSecret) {
  throw new Error('Missing Nucleus credentials');
}
```

### 2. Singleton Instance

```typescript
// services/nucleus.ts
let nucleusInstance: NucleusClient | null = null;

export function getNucleus(): NucleusClient {
  if (!nucleusInstance) {
    nucleusInstance = new NucleusClient({...});
  }
  return nucleusInstance;
}
```

### 3. Error Logging

```typescript
async function safeNucleusCall<T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error('[Nucleus] Call failed:', error);
    // Log to your error tracking service
    return fallback;
  }
}
```

### 4. Rate Limit Monitoring

```typescript
let rateLimitWarned = false;

async function checkRateLimit(result: any) {
  if (result.rateLimit?.perMinute < 10 && !rateLimitWarned) {
    console.warn('[Nucleus] Approaching rate limit!');
    rateLimitWarned = true;
    setTimeout(() => rateLimitWarned = false, 60000);
  }
}
```

## Troubleshooting

### Authentication Errors

```
Error: Invalid signature
```

**Solution:** Verify your HMAC secret is correct and matches Nucleus configuration.

### Rate Limit Errors

```
Error: Rate limit exceeded
```

**Solution:** Implement backoff/retry logic and monitor your usage.

### Network Errors

```
Error: ECONNREFUSED
```

**Solution:** Verify Nucleus URL is correct and service is running.

## Support

For issues or questions:
1. Check the [API Gateway Documentation](./API-GATEWAY.md)
2. Verify your credentials and configuration
3. Check Nucleus logs for detailed error information
4. Review rate limit status in response headers

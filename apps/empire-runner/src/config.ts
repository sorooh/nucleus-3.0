/**
 * PHASE 11.5: EMPIRE PRO+ CONFIG
 * Environment configuration with Zod validation
 */

import { z } from 'zod';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from env/.env.local or default
const envPath = process.env.ENV_PATH || resolve(process.cwd(), 'env/.env.local');
dotenv.config({ path: envPath });

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL URL'),
  
  // Ports
  PORT: z.string().default('5000').transform(Number),
  PORT_API: z.string().default('8080').transform(Number),
  
  // Features
  QUANTUM_ENABLED: z.string().default('true').transform(v => v === 'true'),
  GOVERNANCE_ENFORCE: z.string().default('true').transform(v => v === 'true'),
  EVOLUTION_ENABLED: z.string().default('true').transform(v => v === 'true'),
  
  // AI Providers (optional)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  
  // Redis/Upstash
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  UPSTASH_VECTOR_REST_URL: z.string().optional(),
  UPSTASH_VECTOR_REST_TOKEN: z.string().optional(),
  
  // Runner Config
  HEALTH_CHECK_TIMEOUT: z.string().default('20000').transform(Number),
  GRACEFUL_SHUTDOWN_TIMEOUT: z.string().default('30000').transform(Number),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type EmpireConfig = z.infer<typeof ConfigSchema>;

let config: EmpireConfig;

try {
  config = ConfigSchema.parse(process.env);
} catch (error) {
  console.error('❌ Configuration validation failed:');
  if (error instanceof z.ZodError) {
    (error as z.ZodError).issues.forEach((err: any) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
  }
  process.exit(1);
}

export { config as cfg };

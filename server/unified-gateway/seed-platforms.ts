/**
 * Seed Platforms - تسجيل المنصات الـ 17 الحقيقية في Platform Registry
 * 
 * المنصات:
 * - 17 منصة داخلية موجودة فعلياً (INTERNAL_JWT)
 * 
 * البيان الهندسي السيادي - منظومة سُروح
 */

import { db } from '../db';
import { platformRegistry, InsertPlatformRegistry } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Helper: Generate credentials
 */
function generateCredentials(platformId: string, authMode: string) {
  const masterSecret = process.env.JWT_SECRET || 'nucleus-jwt-secret';
  
  if (authMode === 'ENHANCED') {
    return {
      apiKey: `${platformId}_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`,
      hmacSecret: crypto.randomBytes(32).toString('hex'),
      jwtSecret: crypto.createHash('sha256').update(`${platformId}:${masterSecret}:${Date.now()}`).digest('hex'),
    };
  } else {
    // INTERNAL_JWT
    return {
      jwtSecret: crypto.createHash('sha256').update(`${platformId}:${masterSecret}:${Date.now()}`).digest('hex'),
    };
  }
}

/**
 * Platform Definitions - الـ 17 منصة الحقيقية
 */
const platformDefinitions: Omit<InsertPlatformRegistry, 'apiKey' | 'hmacSecret' | 'jwtSecret'>[] = [
  // ==================== INTERNAL_JWT MODE (Real Platforms) ====================
  
  // نيكولاس - النواة المركزية
  {
    platformId: 'nicholas',
    displayName: 'Nicholas 3.2 Core',
    arabicName: 'نيكولاس - النواة المركزية',
    platformType: 'NICHOLAS_CORE',
    ownerTeam: 'Core AI Team',
    description: 'Supreme Sovereign Reference - Central AI consciousness and strategic core',
    authMode: 'INTERNAL_JWT',
    allowedEndpoints: ['/api/uil/*', '/api/consciousness/*', '/api/intelligence/*'],
    dataScopes: ['memory:read', 'memory:write', 'nucleus:analyze', 'ai:supreme', 'consciousness:full'],
    rbacRole: 'platform',
    rateLimitRPM: 300,
    rateLimitRPH: 3000,
    isActive: 1,
    status: 'active',
    telemetryEnabled: 1,
    traceLevel: 'INFO',
    tags: ['core', 'critical', 'production', 'supreme'],
  },
  
  // سيدا - نظام Federation
  {
    platformId: 'side',
    displayName: 'SIDE Federation System',
    arabicName: 'سيدا - نظام الفيدرالية',
    platformType: 'SIDE_FEDERATION',
    ownerTeam: 'Federation Team',
    description: 'Distributed federation and orchestration system',
    authMode: 'INTERNAL_JWT',
    allowedEndpoints: ['/api/federation/*', '/api/nucleus/*', '/ws/federation'],
    dataScopes: ['memory:read', 'memory:write', 'nucleus:analyze', 'federation:manage'],
    rbacRole: 'platform',
    rateLimitRPM: 250,
    rateLimitRPH: 2500,
    isActive: 1,
    status: 'active',
    telemetryEnabled: 1,
    traceLevel: 'INFO',
    tags: ['federation', 'critical', 'production'],
  },
  
  // ماتريكس - نظام الوعي
  {
    platformId: 'matrix',
    displayName: 'Conscious Matrix System',
    arabicName: 'ماتريكس - نظام الوعي',
    platformType: 'CONSCIOUS_MATRIX',
    ownerTeam: 'Consciousness Team',
    description: 'Consciousness and self-awareness matrix system',
    authMode: 'INTERNAL_JWT',
    allowedEndpoints: ['/api/consciousness/*', '/api/matrix/*', '/api/reflection/*'],
    dataScopes: ['memory:read', 'memory:write', 'consciousness:manage', 'reflection:full'],
    rbacRole: 'platform',
    rateLimitRPM: 200,
    rateLimitRPH: 2000,
    isActive: 1,
    status: 'active',
    telemetryEnabled: 1,
    traceLevel: 'INFO',
    tags: ['consciousness', 'critical', 'production'],
  },
  
  {
    platformId: 'academy',
    displayName: 'Surooh Academy Platform',
    arabicName: 'منصة أكاديمية سُروح',
    platformType: 'ACADEMY',
    ownerTeam: 'Education Team',
    description: 'Educational platform with AI-powered learning',
    authMode: 'INTERNAL_JWT',
    allowedEndpoints: ['/api/uil/*', '/api/academy/*', '/api/intelligence/*'],
    dataScopes: ['memory:read', 'nucleus:analyze', 'education:manage'],
    rbacRole: 'platform',
    rateLimitRPM: 120,
    rateLimitRPH: 1200,
    isActive: 1,
    status: 'active',
    telemetryEnabled: 1,
    traceLevel: 'INFO',
    tags: ['internal', 'production'],
  },
  {
    platformId: 'mailhub',
    displayName: 'Mail Hub Core',
    arabicName: 'نواة مركز البريد',
    platformType: 'MAIL_HUB',
    ownerTeam: 'Communication Team',
    description: 'Centralized email management system',
    authMode: 'INTERNAL_JWT',
    allowedEndpoints: ['/api/uil/*', '/api/nucleus/*', '/ws/nucleus'],
    dataScopes: ['memory:read', 'memory:write', 'nucleus:analyze', 'communication:manage'],
    rbacRole: 'platform',
    rateLimitRPM: 150,
    rateLimitRPH: 1500,
    isActive: 1,
    status: 'active',
    telemetryEnabled: 1,
    traceLevel: 'INFO',
    tags: ['internal', 'critical', 'production'],
  },
  {
    platformId: 'customer-service',
    displayName: 'Customer Service Platform',
    arabicName: 'منصة خدمة العملاء',
    platformType: 'CUSTOMER_SERVICE',
    ownerTeam: 'Support Team',
    description: 'AI-powered customer service and support',
    authMode: 'INTERNAL_JWT',
    allowedEndpoints: ['/api/uil/*', '/api/nucleus/customer/*', '/api/intelligence/*'],
    dataScopes: ['memory:read', 'memory:write', 'nucleus:analyze', 'support:manage'],
    rbacRole: 'platform',
    rateLimitRPM: 100,
    rateLimitRPH: 1000,
    isActive: 1,
    status: 'active',
    telemetryEnabled: 1,
    traceLevel: 'INFO',
    tags: ['internal', 'production'],
  },
  {
    platformId: 'scp',
    displayName: 'Surooh Chat Platform',
    arabicName: 'منصة سُروح للدردشة',
    platformType: 'SCP',
    ownerTeam: 'Communication Team',
    description: 'Real-time chat platform with AI assistants',
    authMode: 'INTERNAL_JWT',
    allowedEndpoints: ['/api/uil/*', '/api/scp/*', '/api/intelligence/*'],
    dataScopes: ['memory:read', 'memory:write', 'nucleus:analyze', 'chat:manage'],
    rbacRole: 'platform',
    rateLimitRPM: 200,
    rateLimitRPH: 2000,
    isActive: 1,
    status: 'active',
    telemetryEnabled: 1,
    traceLevel: 'INFO',
    tags: ['internal', 'realtime', 'production'],
  },
  {
    platformId: 'docs',
    displayName: 'Abosham Docs Platform',
    arabicName: 'منصة أبوشام للوثائق',
    platformType: 'DOCS',
    ownerTeam: 'Documentation Team',
    description: 'Document management and collaboration platform',
    authMode: 'INTERNAL_JWT',
    allowedEndpoints: ['/api/uil/*', '/api/webhooks/docs', '/api/intelligence/*'],
    dataScopes: ['memory:read', 'nucleus:analyze', 'docs:manage'],
    rbacRole: 'platform',
    rateLimitRPM: 80,
    rateLimitRPH: 800,
    isActive: 1,
    status: 'active',
    telemetryEnabled: 1,
    traceLevel: 'INFO',
    tags: ['internal', 'production'],
  },
  {
    platformId: 'b2b',
    displayName: 'Surooh B2B Brain',
    arabicName: 'عقل سُروح للأعمال',
    platformType: 'B2B',
    ownerTeam: 'Business Team',
    description: 'B2B commerce and business intelligence',
    authMode: 'INTERNAL_JWT',
    allowedEndpoints: ['/api/uil/*', '/api/v1/b2b/*', '/ws/nucleus'],
    dataScopes: ['memory:read', 'memory:write', 'nucleus:analyze', 'business:manage'],
    rbacRole: 'platform',
    rateLimitRPM: 120,
    rateLimitRPH: 1200,
    isActive: 1,
    status: 'active',
    telemetryEnabled: 1,
    traceLevel: 'INFO',
    tags: ['internal', 'business', 'production'],
  },
  {
    platformId: 'b2c',
    displayName: 'Surooh B2C Brain',
    arabicName: 'عقل سُروح للمستهلكين',
    platformType: 'B2C',
    ownerTeam: 'Commerce Team',
    description: 'B2C ecommerce and consumer intelligence',
    authMode: 'INTERNAL_JWT',
    allowedEndpoints: ['/api/uil/*', '/api/v1/b2c/*', '/ws/nucleus'],
    dataScopes: ['memory:read', 'memory:write', 'nucleus:analyze', 'commerce:manage'],
    rbacRole: 'platform',
    rateLimitRPM: 120,
    rateLimitRPH: 1200,
    isActive: 1,
    status: 'active',
    telemetryEnabled: 1,
    traceLevel: 'INFO',
    tags: ['internal', 'commerce', 'production'],
  },
  {
    platformId: 'accounting',
    displayName: 'Surooh Accounting Brain',
    arabicName: 'عقل سُروح للمحاسبة',
    platformType: 'ACCOUNTING',
    ownerTeam: 'Finance Team',
    description: 'Accounting and financial management',
    authMode: 'INTERNAL_JWT',
    allowedEndpoints: ['/api/uil/*', '/api/v1/accounting/*'],
    dataScopes: ['memory:read', 'nucleus:analyze', 'finance:manage'],
    rbacRole: 'platform',
    rateLimitRPM: 80,
    rateLimitRPH: 800,
    isActive: 1,
    status: 'active',
    telemetryEnabled: 1,
    traceLevel: 'INFO',
    tags: ['internal', 'finance', 'production'],
  },
  {
    platformId: 'ce',
    displayName: 'Surooh CE Brain',
    arabicName: 'عقل سُروح للتصدير',
    platformType: 'CE',
    ownerTeam: 'Export Team',
    description: 'Cross-border ecommerce and export management',
    authMode: 'INTERNAL_JWT',
    allowedEndpoints: ['/api/uil/*', '/api/v1/ce/*'],
    dataScopes: ['memory:read', 'nucleus:analyze', 'export:manage'],
    rbacRole: 'platform',
    rateLimitRPM: 60,
    rateLimitRPH: 600,
    isActive: 1,
    status: 'active',
    telemetryEnabled: 1,
    traceLevel: 'INFO',
    tags: ['internal', 'export', 'production'],
  },
  {
    platformId: 'secretary',
    displayName: 'Surooh Secretary Brain',
    arabicName: 'عقل سُروح للسكرتارية',
    platformType: 'SECRETARY',
    ownerTeam: 'Admin Team',
    description: 'Administrative assistant and task management',
    authMode: 'INTERNAL_JWT',
    allowedEndpoints: ['/api/uil/*', '/api/v1/secretary/*'],
    dataScopes: ['memory:read', 'nucleus:analyze', 'admin:manage'],
    rbacRole: 'platform',
    rateLimitRPM: 80,
    rateLimitRPH: 800,
    isActive: 1,
    status: 'active',
    telemetryEnabled: 1,
    traceLevel: 'INFO',
    tags: ['internal', 'admin', 'production'],
  },
  {
    platformId: 'wallet',
    displayName: 'Surooh Wallet',
    arabicName: 'محفظة سُروح',
    platformType: 'WALLET',
    ownerTeam: 'Finance Team',
    description: 'Digital wallet and payment management',
    authMode: 'INTERNAL_JWT',
    allowedEndpoints: ['/api/uil/*', '/api/v1/wallet/*'],
    dataScopes: ['memory:read', 'nucleus:analyze', 'wallet:manage'],
    rbacRole: 'platform',
    rateLimitRPM: 120,
    rateLimitRPH: 1200,
    isActive: 1,
    status: 'active',
    telemetryEnabled: 1,
    traceLevel: 'INFO',
    tags: ['internal', 'finance', 'critical', 'production'],
  },
  {
    platformId: 'multibot',
    displayName: 'MultiBot Command & Control',
    arabicName: 'مركز قيادة البوتات',
    platformType: 'MULTIBOT',
    ownerTeam: 'AI Team',
    description: 'Bot orchestration and management system',
    authMode: 'INTERNAL_JWT',
    allowedEndpoints: ['/api/uil/*', '/api/nucleus/*', '/ws/control'],
    dataScopes: ['memory:read', 'memory:write', 'nucleus:analyze', 'bots:manage'],
    rbacRole: 'platform',
    rateLimitRPM: 200,
    rateLimitRPH: 2000,
    isActive: 1,
    status: 'active',
    telemetryEnabled: 1,
    traceLevel: 'INFO',
    tags: ['internal', 'ai', 'critical', 'production'],
  },
  {
    platformId: 'v2-integration',
    displayName: 'V2 Integration Gateway',
    arabicName: 'بوابة التكامل V2',
    platformType: 'V2_INTEGRATION',
    ownerTeam: 'Integration Team',
    description: 'Legacy system integration gateway',
    authMode: 'INTERNAL_JWT',
    allowedEndpoints: ['/api/uil/*', '/api/nucleus/*'],
    dataScopes: ['memory:read', 'nucleus:analyze'],
    rbacRole: 'service',
    rateLimitRPM: 100,
    rateLimitRPH: 1000,
    isActive: 1,
    status: 'active',
    telemetryEnabled: 1,
    traceLevel: 'INFO',
    tags: ['internal', 'integration', 'production'],
  },
  {
    platformId: 'intelligence-feed',
    displayName: 'External Intelligence Feed System',
    arabicName: 'نظام التغذية الاستخباراتية الخارجية',
    platformType: 'INTELLIGENCE_FEED',
    ownerTeam: 'Intelligence Team',
    description: 'External data connectors (NewsAPI, Weather, Crypto, etc.)',
    authMode: 'INTERNAL_JWT',
    allowedEndpoints: ['/api/uil/*', '/api/connectors/*', '/api/intelligence/*'],
    dataScopes: ['memory:write', 'nucleus:analyze', 'feeds:manage'],
    rbacRole: 'service',
    rateLimitRPM: 150,
    rateLimitRPH: 1500,
    isActive: 1,
    status: 'active',
    telemetryEnabled: 1,
    traceLevel: 'INFO',
    tags: ['internal', 'intelligence', 'production'],
  },
];

/**
 * Seed all platforms
 */
export async function seedPlatforms() {
  console.log('[Unified Gateway] Seeding platforms into registry...');

  let registered = 0;
  let skipped = 0;
  const credentials: any[] = [];

  for (const platformDef of platformDefinitions) {
    try {
      // Check if already exists
      const [existing] = await db
        .select()
        .from(platformRegistry)
        .where(eq(platformRegistry.platformId, platformDef.platformId))
        .limit(1);

      if (existing) {
        console.log(`[Unified Gateway] ⏭️  Platform already registered: ${platformDef.displayName}`);
        skipped++;
        continue;
      }

      // Generate credentials
      const creds = generateCredentials(platformDef.platformId, platformDef.authMode);

      // Insert platform
      const [platform] = await db
        .insert(platformRegistry)
        .values({
          ...platformDef,
          ...creds,
        })
        .returning();

      console.log(`[Unified Gateway] ✅ Registered: ${platform.displayName} (${platform.authMode})`);
      
      // Store credentials for logging (only for ENHANCED mode)
      if (platformDef.authMode === 'ENHANCED') {
        credentials.push({
          platformId: platform.platformId,
          displayName: platform.displayName,
          ...creds,
        });
      }

      registered++;
    } catch (error: any) {
      console.error(`[Unified Gateway] ❌ Failed to register ${platformDef.displayName}:`, error.message);
    }
  }

  console.log(`\n[Unified Gateway] ========================================`);
  console.log(`[Unified Gateway] Platform Registry Seeding Complete`);
  console.log(`[Unified Gateway] ✅ Registered: ${registered}`);
  console.log(`[Unified Gateway] ⏭️  Skipped: ${skipped}`);
  console.log(`[Unified Gateway] 📊 Total: ${platformDefinitions.length}`);
  console.log(`[Unified Gateway] ========================================\n`);

  // Log ENHANCED credentials (store these securely!)
  if (credentials.length > 0) {
    console.log(`\n[Unified Gateway] ⚠️  ENHANCED Mode Credentials (Save Securely!):`);
    console.log(`[Unified Gateway] ========================================`);
    for (const cred of credentials) {
      console.log(`\nPlatform: ${cred.displayName} (${cred.platformId})`);
      console.log(`API Key: ${cred.apiKey}`);
      console.log(`HMAC Secret: ${cred.hmacSecret}`);
      console.log(`JWT Secret: ${cred.jwtSecret}`);
    }
    console.log(`\n[Unified Gateway] ========================================\n`);
  }

  return { registered, skipped, total: platformDefinitions.length };
}

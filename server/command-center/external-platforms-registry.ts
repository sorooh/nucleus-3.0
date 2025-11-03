/**
 * 🌐 External Platforms Registry
 * 
 * Registry for all external Replit platforms connected to Nicholas 3.2
 * via Federation Gateway (JWT + HMAC + RSA Security)
 * 
 * @module ExternalPlatformsRegistry
 */

import { db } from '../db';
import { federationNodes, type InsertFederationNode } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * External Replit Platforms - All connected platforms
 */
export const EXTERNAL_PLATFORMS = [
  {
    nodeId: 'mail-hub-external',
    nodeName: 'Surooh Mail Hub',
    arabicName: 'مركز البريد الإلكتروني',
    nodeType: 'communication',
    nodeUrl: 'https://81bb6568-a62a-447c-959e-35acee7d23de-00-10jx6lvvjb45s.picard.replit.dev',
    nucleusLevel: 'main',
    priority: 'high',
  },
  {
    nodeId: 'accounting-external',
    nodeName: 'Surooh Accounting Platform',
    arabicName: 'منصة المحاسبة',
    nodeType: 'accounting',
    nodeUrl: 'https://73b3347f-6fdd-4b54-bc34-a358ee4e3305-00-1qu89ecl2bxxg.kirk.replit.dev',
    nucleusLevel: 'main',
    priority: 'critical',
  },
  {
    nodeId: 'loyalty-wallet-external',
    nodeName: 'Loyalty Wallet',
    arabicName: 'محفظة الولاء',
    nodeType: 'finance',
    nodeUrl: 'https://34ea74b4-8749-4be0-b87a-0487ff455399-00-3p86r3fp9jnww.worf.replit.dev',
    nucleusLevel: 'main',
    priority: 'high',
  },
  {
    nodeId: 'euverify-external',
    nodeName: 'EUVerify - GPSR Compliance',
    arabicName: 'نظام المطابقة الأوروبية',
    nodeType: 'compliance',
    nodeUrl: 'https://b97712a3-2561-4ae1-bede-ccf2add00d95-00-15tljvf85nsgm.picard.replit.dev',
    nucleusLevel: 'main',
    priority: 'high',
  },
  {
    nodeId: 'borvat-dashboard-external',
    nodeName: 'BORVAT Smart Dashboard',
    arabicName: 'لوحة تحكم بورفات الذكية',
    nodeType: 'business',
    nodeUrl: 'https://8b900441-477c-48f8-926d-f6c7c3f71153-00-2mykra4vwx3ll.worf.replit.dev',
    nucleusLevel: 'main',
    priority: 'high',
  },
  {
    nodeId: 'borvat-marketplace-external',
    nodeName: 'Borvat Marketplace (B2C)',
    arabicName: 'سوق بورفات',
    nodeType: 'commerce',
    nodeUrl: 'https://fdbe8cf7-d64f-4ee9-b614-534486e6ea72-00-2oh85pej3k9kx.janeway.replit.dev',
    nucleusLevel: 'main',
    priority: 'critical',
  },
  {
    nodeId: 'b2c-wholesale-external',
    nodeName: 'B2C Wholesale Platform',
    arabicName: 'منصة البيع بالجملة',
    nodeType: 'commerce',
    nodeUrl: 'https://d395c145-1f0c-4980-bc48-df43ee1d56d3-00-2xhbwdypd3s15.janeway.replit.dev',
    nucleusLevel: 'main',
    priority: 'high',
  },
  {
    nodeId: 'marketing-platform-external',
    nodeName: 'Marketing Platform',
    arabicName: 'منصة التسويق - ماركتينك',
    nodeType: 'marketing',
    nodeUrl: 'https://3973a260-6c15-4686-bb4b-90d62e175a4c-00-3n5uh999ur5et.riker.replit.dev',
    nucleusLevel: 'main',
    priority: 'normal',
  },
  {
    nodeId: 'digital-secretary-external',
    nodeName: 'Digital Secretary',
    arabicName: 'السكرتيرة الرقمية',
    nodeType: 'management',
    nodeUrl: 'https://85df1963-45fd-4ee7-883e-34cf1fb3b694-00-35bqo22779vm.janeway.replit.dev',
    nucleusLevel: 'main',
    priority: 'normal',
  },
  {
    nodeId: 'bol-scraper-external',
    nodeName: 'Bol.com Product Scraper',
    arabicName: 'أداة استخراج بيانات المنتجات',
    nodeType: 'intelligence',
    nodeUrl: 'https://d42b9429-b155-49b2-9f59-2c6f51a63bc6-00-3mep1dv6j6p14.janeway.replit.dev',
    nucleusLevel: 'sub',
    priority: 'normal',
  },
  {
    nodeId: 'customer-service-external',
    nodeName: 'Customer Service System',
    arabicName: 'نظام خدمة العملاء الذكي',
    nodeType: 'support',
    nodeUrl: 'https://b2f8ef7b-56ac-463b-81de-02afc531fbd2-00-1mdr6sx4y3tq1.janeway.replit.dev',
    nucleusLevel: 'main',
    priority: 'high',
  },
  {
    nodeId: 'personal-financial-external',
    nodeName: 'Personal Financial System',
    arabicName: 'نظام سروح المالي الشخصي',
    nodeType: 'finance',
    nodeUrl: 'https://7f5d57b2-91f6-4df1-a6b5-1a922fcc8bdc-00-13cogysrfsj0b.spock.replit.dev',
    nucleusLevel: 'sub',
    priority: 'normal',
  },
] as const;

/**
 * Generate secure credentials for external platform
 */
function generatePlatformCredentials(nodeId: string, nodeType: string) {
  const secret = process.env.JWT_SECRET || 'nicholas-3.2-federation-secret';
  
  // Generate JWT token
  const authToken = jwt.sign(
    {
      nodeId,
      nodeType,
      issuer: 'nicholas-3.2',
      audience: 'surooh-federation',
      purpose: 'external-platform-auth'
    },
    secret,
    { expiresIn: '365d' }
  );
  
  // Generate HMAC secret
  const hmacSecret = crypto.randomBytes(32).toString('hex');
  
  // Generate code signature
  const timestamp = Date.now();
  const data = `SUROOH-DNA-${nodeId}-${nodeType}-${timestamp}`;
  const codeSignature = crypto.createHash('sha256').update(data).digest('hex');
  
  return {
    authToken,
    hmacSecret,
    codeSignature,
  };
}

/**
 * Register external platform in Federation Gateway
 */
export async function registerExternalPlatform(platformData: typeof EXTERNAL_PLATFORMS[number]) {
  try {
    // Check if platform already exists
    const [existing] = await db
      .select()
      .from(federationNodes)
      .where(eq(federationNodes.nodeId, platformData.nodeId));

    // Generate credentials
    const credentials = generatePlatformCredentials(
      platformData.nodeId,
      platformData.nodeType
    );

    const nodeData: InsertFederationNode = {
      nodeId: platformData.nodeId,
      nodeName: platformData.nodeName,
      arabicName: platformData.arabicName,
      nodeType: platformData.nodeType,
      nodeUrl: platformData.nodeUrl,
      organizationId: 'surooh-holding',
      nucleusLevel: platformData.nucleusLevel,
      apiVersion: 'v1',
      permissions: ['platform:connect', 'knowledge:share', 'heartbeat:send'],
      allowedEndpoints: ['/api/federation/heartbeat', '/api/federation/sync'],
      governanceLevel: 'standard',
      status: 'active',
      health: 100,
      syncProtocol: 'periodic',
      capabilities: {
        external_platform: true,
        replit_hosted: true,
        priority: platformData.priority,
      },
      tags: ['external', 'replit', 'production', platformData.nodeType],
    };

    if (existing) {
      // Update existing platform
      await db
        .update(federationNodes)
        .set({
          ...nodeData,
          updatedAt: new Date(),
        })
        .where(eq(federationNodes.nodeId, platformData.nodeId));

      console.log(`[External Platforms] ✅ Updated: ${platformData.nodeName}`);
      return { 
        action: 'updated', 
        nodeId: platformData.nodeId,
        credentials: {
          authToken: existing.authToken, // Keep existing token
          hmacSecret: existing.hmacSecret, // Keep existing secret
        }
      };
    } else {
      // Insert new platform with credentials
      await db.insert(federationNodes).values({
        ...nodeData,
        authToken: credentials.authToken,
        hmacSecret: credentials.hmacSecret,
        codeSignature: credentials.codeSignature,
      });

      console.log(`[External Platforms] ✅ Registered: ${platformData.nodeName}`);
      return { 
        action: 'registered', 
        nodeId: platformData.nodeId,
        credentials: {
          authToken: credentials.authToken,
          hmacSecret: credentials.hmacSecret,
        }
      };
    }
  } catch (error: any) {
    console.error(`[External Platforms] ❌ Error registering ${platformData.nodeName}:`, error);
    throw error;
  }
}

/**
 * Register all external platforms
 */
export async function registerAllExternalPlatforms() {
  console.log('[External Platforms] 🌐 Registering all external Replit platforms...');

  let registered = 0;
  let updated = 0;
  let failed = 0;
  const credentials: Record<string, any> = {};

  for (const platform of EXTERNAL_PLATFORMS) {
    try {
      const result = await registerExternalPlatform(platform);
      if (result.action === 'registered') {
        registered++;
        credentials[platform.nodeId] = result.credentials;
      }
      if (result.action === 'updated') updated++;
    } catch (error) {
      failed++;
      console.error(`[External Platforms] Failed to register: ${platform.nodeName}`);
    }
  }

  console.log(`[External Platforms] ✅ Registration complete!`);
  console.log(`   - Registered: ${registered}`);
  console.log(`   - Updated: ${updated}`);
  console.log(`   - Failed: ${failed}`);
  console.log(`   - Total: ${EXTERNAL_PLATFORMS.length}`);

  return {
    total: EXTERNAL_PLATFORMS.length,
    registered,
    updated,
    failed,
    credentials, // Return credentials for newly registered platforms
  };
}

/**
 * Get all external platforms
 */
export async function getAllExternalPlatforms() {
  const platforms = [];
  
  for (const platform of EXTERNAL_PLATFORMS) {
    const [node] = await db
      .select()
      .from(federationNodes)
      .where(eq(federationNodes.nodeId, platform.nodeId));
    
    if (node) {
      platforms.push(node);
    }
  }
  
  return platforms;
}

/**
 * Get external platform by ID
 */
export async function getExternalPlatform(nodeId: string) {
  const [node] = await db
    .select()
    .from(federationNodes)
    .where(eq(federationNodes.nodeId, nodeId));
  
  return node;
}

/**
 * Update platform health status
 */
export async function updateExternalPlatformHealth(nodeId: string, health: number, status: string) {
  await db
    .update(federationNodes)
    .set({
      status,
      health,
      lastHeartbeat: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(federationNodes.nodeId, nodeId));
  
  console.log(`[External Platforms] ✅ Updated health: ${nodeId} - ${status} (${health}%)`);
}

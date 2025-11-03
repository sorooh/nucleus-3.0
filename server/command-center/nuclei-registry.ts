/**
 * 🌐 Nuclei Registry System
 * 
 * Auto-discovery and registration of all 21 nuclei in Surooh Empire
 * Maintains centralized registry with health monitoring
 * 
 * @module NucleiRegistry
 */

import { db } from '../db';
import { commandCenterNuclei, type InsertCommandCenterNucleus } from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Surooh Empire - Complete Nuclei Registry
 * All 21 nuclei across the empire
 */
export const EMPIRE_NUCLEI = [
  // ============= CORE INTELLIGENCE (3 nuclei) =============
  {
    nucleusId: 'nicholas',
    nucleusName: 'Nicholas 3.2',
    arabicName: 'نيكولاس 3.2',
    nucleusType: 'core',
    category: 'intelligence',
    description: 'Supreme Sovereign Reference - Central AI Brain',
    priority: 'critical',
    endpoint: process.env.NICHOLAS_ENDPOINT || 'http://localhost:5000',
    phaseOmegaActive: 1,
    sideIntegrated: 1,
  },
  {
    nucleusId: 'academy',
    nucleusName: 'Surooh Academy',
    arabicName: 'أكاديمية سروح',
    nucleusType: 'intelligence',
    category: 'education',
    description: 'Training & Bot Generation Platform - Educational Arm',
    priority: 'high',
    endpoint: process.env.ACADEMY_ENDPOINT,
    phaseOmegaActive: 1, // ✅ Phase Ω Limited - Supervised by Nicholas
    sideIntegrated: 1,
  },
  {
    nucleusId: 'side',
    nucleusName: 'SIDE - Intelligent Development Ecosystem',
    arabicName: 'سيدا - النظام التطويري الذكي',
    nucleusType: 'intelligence',
    category: 'development',
    description: 'Embedded development core for all nuclei',
    priority: 'critical',
    endpoint: process.env.SIDE_ENDPOINT,
    phaseOmegaActive: 1,
    sideIntegrated: 1,
  },

  // ============= BUSINESS PLATFORMS (3 nuclei) =============
  {
    nucleusId: 'b2b',
    nucleusName: 'B2B Store',
    arabicName: 'متجر الشركات',
    nucleusType: 'business',
    category: 'commerce',
    description: 'Business-to-Business marketplace',
    priority: 'high',
    endpoint: process.env.B2B_ENDPOINT,
    phaseOmegaActive: 0,
    sideIntegrated: 0,
  },
  {
    nucleusId: 'b2c',
    nucleusName: 'B2C Market',
    arabicName: 'سوق الموردين',
    nucleusType: 'business',
    category: 'commerce',
    description: 'Consumer marketplace',
    priority: 'high',
    endpoint: process.env.B2C_ENDPOINT,
    phaseOmegaActive: 0,
    sideIntegrated: 0,
  },
  {
    nucleusId: 'stockitup',
    nucleusName: 'StockitUp',
    arabicName: 'إدارة المخزون',
    nucleusType: 'business',
    category: 'inventory',
    description: 'Warehouse & inventory management',
    priority: 'normal',
    endpoint: process.env.STOCKITUP_ENDPOINT,
    phaseOmegaActive: 0,
    sideIntegrated: 0,
  },

  // ============= CORE SERVICES (8 nuclei) =============
  {
    nucleusId: 'accounting',
    nucleusName: 'Accounting Platform',
    arabicName: 'نظام المحاسبة',
    nucleusType: 'service',
    category: 'finance',
    description: 'Billing, invoicing, and financial management',
    priority: 'high',
    endpoint: process.env.ACCOUNTING_ENDPOINT,
    phaseOmegaActive: 0,
    sideIntegrated: 0,
  },
  {
    nucleusId: 'legal',
    nucleusName: 'Legal Nucleus',
    arabicName: 'النواة القانونية',
    nucleusType: 'service',
    category: 'legal',
    description: 'Legal documents and contracts management',
    priority: 'high',
    endpoint: process.env.LEGAL_ENDPOINT,
    phaseOmegaActive: 0,
    sideIntegrated: 0,
  },
  {
    nucleusId: 'customer-service',
    nucleusName: 'Customer Service',
    arabicName: 'خدمة العملاء',
    nucleusType: 'service',
    category: 'support',
    description: 'Customer support and ticketing system',
    priority: 'high',
    endpoint: process.env.CUSTOMER_SERVICE_ENDPOINT,
    phaseOmegaActive: 0,
    sideIntegrated: 0,
  },
  {
    nucleusId: 'mail-hub',
    nucleusName: 'Mail Hub',
    arabicName: 'مركز البريد',
    nucleusType: 'service',
    category: 'communication',
    description: 'Email and notification management',
    priority: 'normal',
    endpoint: process.env.MAIL_HUB_ENDPOINT,
    phaseOmegaActive: 0,
    sideIntegrated: 0,
  },
  {
    nucleusId: 'chat',
    nucleusName: 'Chat Nucleus',
    arabicName: 'الدردشة الذكية',
    nucleusType: 'service',
    category: 'communication',
    description: 'Live chat and conversational AI',
    priority: 'normal',
    endpoint: process.env.CHAT_ENDPOINT,
    phaseOmegaActive: 0,
    sideIntegrated: 0,
  },
  {
    nucleusId: 'shipping',
    nucleusName: 'Shipping Platform',
    arabicName: 'منصة الشحن',
    nucleusType: 'service',
    category: 'logistics',
    description: 'Shipping and delivery management',
    priority: 'normal',
    endpoint: process.env.SHIPPING_ENDPOINT,
    phaseOmegaActive: 0,
    sideIntegrated: 0,
  },
  {
    nucleusId: 'wallet',
    nucleusName: 'Surooh Wallet',
    arabicName: 'محفظة سروح',
    nucleusType: 'service',
    category: 'finance',
    description: 'Digital wallet and loyalty program',
    priority: 'high',
    endpoint: process.env.WALLET_ENDPOINT,
    phaseOmegaActive: 0,
    sideIntegrated: 0,
  },
  {
    nucleusId: 'secretary',
    nucleusName: 'Smart Secretary',
    arabicName: 'السكرتيرة الذكية',
    nucleusType: 'service',
    category: 'management',
    description: 'Intelligent administrative assistant',
    priority: 'normal',
    endpoint: process.env.SECRETARY_ENDPOINT,
    phaseOmegaActive: 0,
    sideIntegrated: 0,
  },

  // ============= SPECIALIZED SYSTEMS (7 nuclei) =============
  {
    nucleusId: 'ce-marking',
    nucleusName: 'CE Marking',
    arabicName: 'شهادات المطابقة',
    nucleusType: 'specialized',
    category: 'compliance',
    description: 'CE certification and compliance',
    priority: 'normal',
    endpoint: process.env.CE_MARKING_ENDPOINT,
    phaseOmegaActive: 0,
    sideIntegrated: 0,
  },
  {
    nucleusId: 'procurement',
    nucleusName: 'Procurement',
    arabicName: 'المشتريات',
    nucleusType: 'specialized',
    category: 'business',
    description: 'Supplier and procurement management',
    priority: 'normal',
    endpoint: process.env.PROCUREMENT_ENDPOINT,
    phaseOmegaActive: 0,
    sideIntegrated: 0,
  },
  {
    nucleusId: 'design',
    nucleusName: 'Design Nucleus',
    arabicName: 'نواة التصميم',
    nucleusType: 'specialized',
    category: 'creative',
    description: 'Design and branding platform',
    priority: 'normal',
    endpoint: process.env.DESIGN_ENDPOINT,
    phaseOmegaActive: 0,
    sideIntegrated: 0,
  },
  {
    nucleusId: 'medical',
    nucleusName: 'Medical Nucleus',
    arabicName: 'النواة الطبية',
    nucleusType: 'specialized',
    category: 'healthcare',
    description: 'Medical records and healthcare management',
    priority: 'normal',
    endpoint: process.env.MEDICAL_ENDPOINT,
    phaseOmegaActive: 0,
    sideIntegrated: 0,
  },
  {
    nucleusId: 'crawler',
    nucleusName: 'Crawler Nucleus',
    arabicName: 'الزاحف الذكي',
    nucleusType: 'specialized',
    category: 'intelligence',
    description: 'Web scraping and data extraction',
    priority: 'low',
    endpoint: process.env.CRAWLER_ENDPOINT,
    phaseOmegaActive: 0,
    sideIntegrated: 0,
  },
] as const;

/**
 * Register or update a nucleus in the Command Center
 */
export async function registerNucleus(nucleusData: Partial<InsertCommandCenterNucleus>) {
  try {
    // Check if nucleus already exists
    const [existing] = await db
      .select()
      .from(commandCenterNuclei)
      .where(eq(commandCenterNuclei.nucleusId, nucleusData.nucleusId!));

    if (existing) {
      // Update existing nucleus
      await db
        .update(commandCenterNuclei)
        .set({
          ...nucleusData,
          lastUpdated: new Date(),
        })
        .where(eq(commandCenterNuclei.nucleusId, nucleusData.nucleusId!));

      console.log(`[Nuclei Registry] ✅ Updated nucleus: ${nucleusData.nucleusId}`);
      return { action: 'updated', nucleusId: nucleusData.nucleusId };
    } else {
      // Insert new nucleus
      await db.insert(commandCenterNuclei).values({
        ...nucleusData,
        status: 'unknown',
        health: 0,
      } as InsertCommandCenterNucleus);

      console.log(`[Nuclei Registry] ✅ Registered new nucleus: ${nucleusData.nucleusId}`);
      return { action: 'registered', nucleusId: nucleusData.nucleusId };
    }
  } catch (error: any) {
    console.error(`[Nuclei Registry] ❌ Error registering nucleus ${nucleusData.nucleusId}:`, error);
    throw error;
  }
}

/**
 * Register all empire nuclei
 * Run this on startup to ensure all nuclei are in the registry
 */
export async function registerAllNuclei() {
  console.log('[Nuclei Registry] 🌐 Registering all empire nuclei...');

  let registered = 0;
  let updated = 0;
  let failed = 0;

  for (const nucleus of EMPIRE_NUCLEI) {
    try {
      const result = await registerNucleus(nucleus);
      if (result.action === 'registered') registered++;
      if (result.action === 'updated') updated++;
    } catch (error) {
      failed++;
    }
  }

  console.log(`[Nuclei Registry] ✅ Registration complete!`);
  console.log(`   - Registered: ${registered}`);
  console.log(`   - Updated: ${updated}`);
  console.log(`   - Failed: ${failed}`);
  console.log(`   - Total: ${EMPIRE_NUCLEI.length}`);

  return {
    total: EMPIRE_NUCLEI.length,
    registered,
    updated,
    failed
  };
}

/**
 * Get all registered nuclei
 */
export async function getAllNuclei() {
  return await db.select().from(commandCenterNuclei);
}

/**
 * Get nucleus by ID
 */
export async function getNucleus(nucleusId: string) {
  const [nucleus] = await db
    .select()
    .from(commandCenterNuclei)
    .where(eq(commandCenterNuclei.nucleusId, nucleusId));
  
  return nucleus;
}

/**
 * Update nucleus status and health
 */
export async function updateNucleusHealth(nucleusId: string, status: string, health: number) {
  await db
    .update(commandCenterNuclei)
    .set({
      status,
      health,
      lastHealthCheck: new Date(),
      lastUpdated: new Date(),
    })
    .where(eq(commandCenterNuclei.nucleusId, nucleusId));
}

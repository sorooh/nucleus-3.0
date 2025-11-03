/**
 * Integration Service Layer
 * طبقة خدمة التكاملات - تفصل منطق الأعمال عن قاعدة البيانات
 */

import { db } from '../storage';
import {
  integrationNuclei,
  platformLinks,
  integrationsRegistry,
  type InsertPlatformLink,
  type InsertIntegrationRegistryEntry,
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export class IntegrationService {
  /**
   * Get all platforms with their links and integrations
   */
  async getAllPlatforms() {
    const nuclei = await db.select().from(integrationNuclei);
    const allLinks = await db.select().from(platformLinks);
    const allIntegrations = await db.select().from(integrationsRegistry);

    return nuclei.map(nucleus => {
      const links = allLinks.filter(link => link.platformId === nucleus.id);
      const integrations = allIntegrations.filter(int =>
        int.usedBy && Array.isArray(int.usedBy) && int.usedBy.includes(nucleus.id)
      );

      return {
        id: nucleus.id,
        name: nucleus.name,
        displayName: nucleus.displayName || nucleus.name,
        arabicName: nucleus.arabicName,
        description: nucleus.description,
        type: nucleus.type,
        status: nucleus.status,
        progress: nucleus.progress,
        health: nucleus.health,
        version: nucleus.version,
        lastSeen: nucleus.lastSeen,
        links: links.map(link => ({
          id: link.id,
          connectedTo: link.connectedTo,
          linkType: link.linkType,
          status: link.status,
        })),
        integrations: integrations.map(int => ({
          id: int.id,
          name: int.name,
          provider: int.provider,
          category: int.category,
          ownedBy: int.ownedBy,
          status: int.status,
          healthStatus: int.healthStatus,
        })),
      };
    });
  }

  /**
   * Get a single platform by ID
   */
  async getPlatformById(id: string) {
    const nucleus = await db.select().from(integrationNuclei).where(eq(integrationNuclei.id, id));

    if (!nucleus || nucleus.length === 0) {
      return null;
    }

    const links = await db.select().from(platformLinks).where(eq(platformLinks.platformId, id));
    const allIntegrations = await db.select().from(integrationsRegistry);
    const integrations = allIntegrations.filter(int =>
      int.usedBy && Array.isArray(int.usedBy) && int.usedBy.includes(id)
    );

    return {
      ...nucleus[0],
      links,
      integrations,
    };
  }

  /**
   * Update link status
   */
  async updateLinkStatus(platformId: string, linkId: string, status: 'active' | 'broken' | 'pending') {
    const updated = await db.update(platformLinks)
      .set({ status })
      .where(and(
        eq(platformLinks.id, linkId),
        eq(platformLinks.platformId, platformId)
      ))
      .returning();

    return updated[0] || null;
  }

  /**
   * Get all integrations
   */
  async getAllIntegrations() {
    return await db.select().from(integrationsRegistry);
  }

  /**
   * Register a new integration
   */
  async registerIntegration(data: InsertIntegrationRegistryEntry) {
    // Check if integration already exists
    const existing = await db.select().from(integrationsRegistry)
      .where(and(
        eq(integrationsRegistry.name, data.name),
        eq(integrationsRegistry.provider, data.provider)
      ));

    if (existing && existing.length > 0) {
      return { exists: true, integration: existing[0] };
    }

    // Create new integration
    const newIntegration = await db.insert(integrationsRegistry).values({
      ...data,
      ownedBy: data.ownedBy || 'Nicholas',
      shared: data.shared !== undefined ? (data.shared ? 1 : 0) : 1,
      status: 'active',
      healthStatus: 'unknown',
      usedBy: [],
      requestCount: 0,
      tags: data.tags || [],
      metadata: data.metadata || {},
    }).returning();

    return { exists: false, integration: newIntegration[0] };
  }

  /**
   * Update integration
   */
  async updateIntegration(
    id: string,
    updates: {
      status?: 'active' | 'inactive' | 'deprecated' | 'failed';
      healthStatus?: 'healthy' | 'degraded' | 'down' | 'unknown';
      hasApiKey?: boolean;
    }
  ) {
    const dbUpdates: any = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.healthStatus) dbUpdates.healthStatus = updates.healthStatus;
    if (updates.hasApiKey !== undefined) dbUpdates.hasApiKey = updates.hasApiKey ? 1 : 0;
    if (Object.keys(dbUpdates).length > 0) {
      dbUpdates.updatedAt = new Date();
    }

    const updated = await db.update(integrationsRegistry)
      .set(dbUpdates)
      .where(eq(integrationsRegistry.id, id))
      .returning();

    return updated[0] || null;
  }
}

// Export singleton instance
export const integrationService = new IntegrationService();

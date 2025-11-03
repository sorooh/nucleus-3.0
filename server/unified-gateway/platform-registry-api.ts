/**
 * Platform Registry API
 * 
 * CRUD operations للسجل المركزي للمنصات (الوزارات الرقمية)
 * كل منصة يجب تسجيلها هنا قبل الاتصال بالنواة
 * 
 * البيان الهندسي السيادي - منظومة سُروح
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { platformRegistry, insertPlatformRegistrySchema } from '../../shared/schema';
import { eq, desc, and, or, like, sql } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

/**
 * Helper: Generate secure API key
 */
function generateApiKey(platformId: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(16).toString('hex');
  return `${platformId}_${timestamp}_${random}`;
}

/**
 * Helper: Generate secure HMAC secret
 */
function generateHMACSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Helper: Generate JWT secret
 */
function generateJWTSecret(platformId: string): string {
  const masterSecret = process.env.JWT_SECRET || 'nucleus-jwt-secret';
  return crypto
    .createHash('sha256')
    .update(`${platformId}:${masterSecret}:${Date.now()}`)
    .digest('hex');
}

/**
 * GET /api/registry/platforms
 * List all registered platforms with filters
 * Query params: search, type, status, limit, offset
 */
router.get('/platforms', async (req: Request, res: Response) => {
  try {
    const { search, type, status, limit, offset } = req.query;
    
    let query = db
      .select({
        id: platformRegistry.id,
        platformId: platformRegistry.platformId,
        displayName: platformRegistry.displayName,
        arabicName: platformRegistry.arabicName,
        platformType: platformRegistry.platformType,
        authMode: platformRegistry.authMode,
        status: platformRegistry.status,
        isActive: platformRegistry.isActive,
        rateLimitRPM: platformRegistry.rateLimitRPM,
        rateLimitRPH: platformRegistry.rateLimitRPH,
        allowedEndpoints: platformRegistry.allowedEndpoints,
        dataScopes: platformRegistry.dataScopes,
        registeredAt: platformRegistry.registeredAt,
        lastActive: platformRegistry.lastActive,
        tags: platformRegistry.tags,
      })
      .from(platformRegistry)
      .$dynamic();

    // Apply filters
    const conditions = [];
    if (search && typeof search === 'string') {
      conditions.push(
        or(
          like(platformRegistry.displayName, `%${search}%`),
          like(platformRegistry.arabicName, `%${search}%`),
          like(platformRegistry.platformId, `%${search}%`)
        )
      );
    }
    if (type && typeof type === 'string') {
      conditions.push(eq(platformRegistry.platformType, type));
    }
    if (status && typeof status === 'string') {
      conditions.push(eq(platformRegistry.status, status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(platformRegistry.registeredAt));

    // Apply pagination
    if (limit && typeof limit === 'string') {
      query = query.limit(parseInt(limit, 10));
    }
    if (offset && typeof offset === 'string') {
      query = query.offset(parseInt(offset, 10));
    }

    const platforms = await query;

    res.json({
      success: true,
      count: platforms.length,
      platforms
    });
  } catch (error: any) {
    console.error('[PlatformRegistry] Error listing platforms:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to list platforms',
      message: error.message
    });
  }
});

/**
 * GET /api/registry/platforms/:platformId
 * Get platform details by platformId
 */
router.get('/platforms/:platformId', async (req: Request, res: Response) => {
  try {
    const { platformId } = req.params;

    const [platform] = await db
      .select()
      .from(platformRegistry)
      .where(eq(platformRegistry.platformId, platformId))
      .limit(1);

    if (!platform) {
      return res.status(404).json({
        success: false,
        error: 'Platform not found'
      });
    }

    // Don't expose secrets
    const safePlatform = { ...platform, apiKey: undefined, hmacSecret: undefined, jwtSecret: undefined };

    res.json({
      success: true,
      platform: safePlatform
    });
  } catch (error: any) {
    console.error('[PlatformRegistry] Error getting platform:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get platform',
      message: error.message
    });
  }
});

/**
 * POST /api/registry/platforms
 * Register a new platform
 */
router.post('/platforms', async (req: Request, res: Response) => {
  try {
    const data = insertPlatformRegistrySchema.parse(req.body);

    // Check if platform already exists
    const [existing] = await db
      .select()
      .from(platformRegistry)
      .where(eq(platformRegistry.platformId, data.platformId))
      .limit(1);

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Platform already registered',
        platformId: data.platformId
      });
    }

    // Generate credentials based on auth mode
    let credentials: any = {};

    if (data.authMode === 'ENHANCED') {
      credentials = {
        apiKey: generateApiKey(data.platformId),
        hmacSecret: generateHMACSecret(),
        jwtSecret: generateJWTSecret(data.platformId),
      };
    } else {
      // INTERNAL_JWT
      credentials = {
        jwtSecret: generateJWTSecret(data.platformId),
      };
    }

    // Insert platform
    const [platform] = await db
      .insert(platformRegistry)
      .values({
        ...data,
        ...credentials,
        status: 'registered',
        isActive: 1,
      })
      .returning();

    console.log(`[PlatformRegistry] ✅ Platform registered: ${platform.displayName} (${platform.platformId})`);
    console.log(`[PlatformRegistry] Auth Mode: ${platform.authMode}`);

    // Return credentials (only once!)
    res.status(201).json({
      success: true,
      message: 'Platform registered successfully',
      platform: {
        id: platform.id,
        platformId: platform.platformId,
        displayName: platform.displayName,
        authMode: platform.authMode,
        status: platform.status,
      },
      credentials: {
        apiKey: credentials.apiKey,
        hmacSecret: credentials.hmacSecret,
        jwtSecret: credentials.jwtSecret,
        warning: '⚠️ Save these credentials! They will not be shown again.'
      }
    });
  } catch (error: any) {
    console.error('[PlatformRegistry] Error registering platform:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to register platform',
      message: error.message
    });
  }
});

/**
 * PATCH /api/registry/platforms/:platformId
 * Update platform configuration
 */
router.patch('/platforms/:platformId', async (req: Request, res: Response) => {
  try {
    const { platformId } = req.params;
    const updates = req.body;

    // Prevent updating sensitive fields via this endpoint
    const { apiKey, hmacSecret, jwtSecret, platformId: _, ...allowedUpdates } = updates;

    const [updated] = await db
      .update(platformRegistry)
      .set({
        ...allowedUpdates,
        updatedAt: new Date(),
      })
      .where(eq(platformRegistry.platformId, platformId))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Platform not found'
      });
    }

    console.log(`[PlatformRegistry] ✅ Platform updated: ${updated.displayName}`);

    const safePlatformData = { ...updated, apiKey: undefined, hmacSecret: undefined, jwtSecret: undefined };

    res.json({
      success: true,
      message: 'Platform updated successfully',
      platform: safePlatformData
    });
  } catch (error: any) {
    console.error('[PlatformRegistry] Error updating platform:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update platform',
      message: error.message
    });
  }
});

/**
 * POST /api/registry/platforms/:platformId/rotate-keys
 * Rotate platform credentials
 */
router.post('/platforms/:platformId/rotate-keys', async (req: Request, res: Response) => {
  try {
    const { platformId } = req.params;

    const [platform] = await db
      .select()
      .from(platformRegistry)
      .where(eq(platformRegistry.platformId, platformId))
      .limit(1);

    if (!platform) {
      return res.status(404).json({
        success: false,
        error: 'Platform not found'
      });
    }

    // Generate new credentials
    let newCredentials: any = {};

    if (platform.authMode === 'ENHANCED') {
      newCredentials = {
        apiKey: generateApiKey(platformId),
        hmacSecret: generateHMACSecret(),
        jwtSecret: generateJWTSecret(platformId),
      };
    } else {
      newCredentials = {
        jwtSecret: generateJWTSecret(platformId),
      };
    }

    // Update platform
    const [updated] = await db
      .update(platformRegistry)
      .set({
        ...newCredentials,
        lastKeyRotation: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(platformRegistry.platformId, platformId))
      .returning();

    console.log(`[PlatformRegistry] 🔄 Keys rotated for: ${updated.displayName}`);

    res.json({
      success: true,
      message: 'Credentials rotated successfully',
      credentials: {
        apiKey: newCredentials.apiKey,
        hmacSecret: newCredentials.hmacSecret,
        jwtSecret: newCredentials.jwtSecret,
        warning: '⚠️ Update your application with these new credentials immediately!'
      }
    });
  } catch (error: any) {
    console.error('[PlatformRegistry] Error rotating keys:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to rotate keys',
      message: error.message
    });
  }
});

/**
 * POST /api/registry/platforms/:platformId/activate
 * Activate a platform
 */
router.post('/platforms/:platformId/activate', async (req: Request, res: Response) => {
  try {
    const { platformId } = req.params;

    const [updated] = await db
      .update(platformRegistry)
      .set({
        isActive: 1,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(platformRegistry.platformId, platformId))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Platform not found'
      });
    }

    console.log(`[PlatformRegistry] ✅ Platform activated: ${updated.displayName}`);

    res.json({
      success: true,
      message: 'Platform activated successfully'
    });
  } catch (error: any) {
    console.error('[PlatformRegistry] Error activating platform:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to activate platform',
      message: error.message
    });
  }
});

/**
 * POST /api/registry/platforms/:platformId/suspend
 * Suspend a platform
 */
router.post('/platforms/:platformId/suspend', async (req: Request, res: Response) => {
  try {
    const { platformId } = req.params;

    const [updated] = await db
      .update(platformRegistry)
      .set({
        isActive: 0,
        status: 'suspended',
        updatedAt: new Date(),
      })
      .where(eq(platformRegistry.platformId, platformId))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Platform not found'
      });
    }

    console.log(`[PlatformRegistry] ⛔ Platform suspended: ${updated.displayName}`);

    res.json({
      success: true,
      message: 'Platform suspended successfully'
    });
  } catch (error: any) {
    console.error('[PlatformRegistry] Error suspending platform:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to suspend platform',
      message: error.message
    });
  }
});

/**
 * DELETE /api/registry/platforms/:platformId
 * Delete (archive) a platform
 */
router.delete('/platforms/:platformId', async (req: Request, res: Response) => {
  try {
    const { platformId } = req.params;

    // Soft delete (archive)
    const [updated] = await db
      .update(platformRegistry)
      .set({
        isActive: 0,
        status: 'archived',
        updatedAt: new Date(),
      })
      .where(eq(platformRegistry.platformId, platformId))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Platform not found'
      });
    }

    console.log(`[PlatformRegistry] 🗑️  Platform archived: ${updated.displayName}`);

    res.json({
      success: true,
      message: 'Platform archived successfully'
    });
  } catch (error: any) {
    console.error('[PlatformRegistry] Error archiving platform:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to archive platform',
      message: error.message
    });
  }
});

/**
 * GET /api/registry/stats
 * Get registry statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where status = 'active')::int`,
        suspended: sql<number>`count(*) filter (where status = 'suspended')::int`,
        internal: sql<number>`count(*) filter (where auth_mode = 'INTERNAL_JWT')::int`,
        enhanced: sql<number>`count(*) filter (where auth_mode = 'ENHANCED')::int`,
      })
      .from(platformRegistry);

    res.json({
      success: true,
      stats
    });
  } catch (error: any) {
    console.error('[PlatformRegistry] Error getting stats:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats',
      message: error.message
    });
  }
});

/**
 * POST /api/registry/seed
 * Seed all 18 platforms into registry (Admin only - one-time operation)
 */
router.post('/seed', async (req: Request, res: Response) => {
  try {
    const { seedPlatforms } = await import('./seed-platforms');
    const result = await seedPlatforms();

    res.json({
      success: true,
      message: 'Platform registry seeded successfully',
      result
    });
  } catch (error: any) {
    console.error('[PlatformRegistry] Error seeding platforms:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to seed platforms',
      message: error.message
    });
  }
});

export default router;

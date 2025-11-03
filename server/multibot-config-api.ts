import { Router } from "express";
import crypto from "crypto";

const router = Router();

/**
 * Platform Name Mapping (Arabic)
 */
const PLATFORM_NAMES: Record<string, string> = {
  'B2B': 'منصة التجارة B2B',
  'B2C': 'منصة التجارة B2C',
  'CE': 'محرك التجارة الإلكترونية',
  'Accounting': 'نظام المحاسبة',
  'MAIL_HUB': 'مركز البريد',
  'Nucleus_Internal': 'النواة الداخلية'
};

/**
 * Bot Types with Arabic names
 */
const BOT_TYPES = {
  manager: 'مدير العمليات',
  support: 'الدعم الفني',
  maintenance: 'الصيانة'
};

/**
 * Generate platform-specific HMAC secret
 * Each platform gets a unique secret derived from master seed
 * This prevents secret leakage from compromising all platforms
 */
function generatePlatformSecret(platform: string): string {
  const masterSeed = process.env.SRH_HMAC_SECRET || 'development-secret';
  
  // Create unique secret for each platform
  // Format: SHA256(platform:masterSeed)
  return crypto
    .createHash('sha256')
    .update(`${platform}:${masterSeed}`)
    .digest('hex');
}

/**
 * GET /api/multibot/config/:platform/:botType
 * 
 * Returns ready-to-use .env config for a platform's bot
 * 
 * Example: GET /api/multibot/config/B2B/manager
 */
router.get('/config/:platform/:botType', async (req, res) => {
  try {
    const { platform, botType } = req.params;
    
    // Validate platform
    if (!PLATFORM_NAMES[platform]) {
      return res.status(404).json({
        success: false,
        error: `Unknown platform: ${platform}. Valid platforms: ${Object.keys(PLATFORM_NAMES).join(', ')}`
      });
    }
    
    // Validate bot type
    if (!BOT_TYPES[botType as keyof typeof BOT_TYPES]) {
      return res.status(400).json({
        success: false,
        error: `Unknown bot type: ${botType}. Valid types: manager, support, maintenance`
      });
    }
    
    // Get Nucleus Core URL from environment
    const nucleusUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'http://localhost:5000';
    
    const nucleusWsUrl = nucleusUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    
    // Generate platform-specific HMAC secret
    const platformSecret = generatePlatformSecret(platform);
    
    // Generate bot name
    const botName = `${PLATFORM_NAMES[platform]} - ${BOT_TYPES[botType as keyof typeof BOT_TYPES]}`;
    
    // Build .env file content
    const envContent = `# ====================================
# Nucleus 2.0 - MultiBot Agent Config
# Platform: ${platform}
# Bot Type: ${botType}
# Generated: ${new Date().toISOString()}
# ====================================

# Bot Identity
BOT_UNIT=${platform}
BOT_TYPE=${botType}
BOT_NAME=${botName}
SRH_SOURCE=${platform}

# Nucleus Core Connection
CENTRAL_BASE_URL=${nucleusUrl}
CENTRAL_WS_URL=${nucleusWsUrl}

# Security Keys (Platform-Specific Secret)
# ⚠️ هذا المفتاح خاص بمنصة ${platform} فقط
SRH_HMAC_SECRET=${platformSecret}

# Optional: Auto IP Detection (default: enabled)
AUTO_DETECT_IP=true

# Optional: Heartbeat Interval (default: 30000ms = 30 seconds)
HEARTBEAT_INTERVAL=30000

# Optional: Recovery Settings
MAX_RETRY_ATTEMPTS=3
RETRY_DELAY=5000
`;

    res.json({
      success: true,
      platform,
      botType,
      platformName: PLATFORM_NAMES[platform],
      botName,
      nucleusUrl,
      envFile: envContent,
      instructions: {
        ar: `
📋 تعليمات التنصيب:

1️⃣ احفظ محتوى envFile في ملف .env
2️⃣ شغّل: npm install
3️⃣ شغّل: npm start
4️⃣ تأكد من الاتصال في Nucleus Dashboard: ${nucleusUrl}/agents

✅ البوت سيتصل تلقائياً بنواة سُروح المركزية
        `.trim(),
        en: `
📋 Installation Instructions:

1️⃣ Save envFile content to .env file
2️⃣ Run: npm install
3️⃣ Run: npm start
4️⃣ Verify connection in Nucleus Dashboard: ${nucleusUrl}/agents

✅ Bot will automatically connect to Surooh Nucleus Core
        `.trim()
      }
    });
    
    console.log(`[MultiBotConfig] Config generated for ${platform}/${botType}`);
    
  } catch (error: any) {
    console.error('[MultiBotConfig] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate config',
      message: error.message
    });
  }
});

/**
 * GET /api/multibot/platforms
 * 
 * Returns list of available platforms
 */
router.get('/platforms', async (req, res) => {
  try {
    const platforms = Object.entries(PLATFORM_NAMES).map(([key, nameAr]) => ({
      id: key,
      nameAr,
      botTypes: Object.entries(BOT_TYPES).map(([type, nameAr]) => ({
        id: type,
        nameAr,
        configUrl: `/api/multibot/config/${key}/${type}`
      }))
    }));
    
    res.json({
      success: true,
      platforms,
      totalPlatforms: platforms.length,
      totalBots: platforms.length * 3 // Each platform has 3 bot types
    });
  } catch (error: any) {
    console.error('[MultiBotConfig] Error listing platforms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list platforms',
      message: error.message
    });
  }
});

/**
 * POST /api/multibot/validate-config
 * 
 * Validates if a platform's config is correct
 */
router.post('/validate-config', async (req, res) => {
  try {
    const { platform, botType, hmacSecret } = req.body;
    
    // Validate required fields
    if (!platform || !botType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: platform, botType'
      });
    }
    
    // Check if HMAC secret matches
    const serverSecret = process.env.SRH_HMAC_SECRET || 'development-secret';
    const secretMatches = hmacSecret === serverSecret;
    
    res.json({
      success: true,
      validation: {
        platform: PLATFORM_NAMES[platform] ? 'valid' : 'invalid',
        botType: BOT_TYPES[botType as keyof typeof BOT_TYPES] ? 'valid' : 'invalid',
        hmacSecret: secretMatches ? 'valid' : 'invalid'
      },
      canConnect: secretMatches && PLATFORM_NAMES[platform] && BOT_TYPES[botType as keyof typeof BOT_TYPES]
    });
  } catch (error: any) {
    console.error('[MultiBotConfig] Validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Validation failed',
      message: error.message
    });
  }
});

export default router;

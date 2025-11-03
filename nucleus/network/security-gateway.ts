import { Router, Request, Response } from 'express';
import { securityGuard } from '../core/security-guard';

export const securityGateway = Router();

securityGateway.get('/status', async (req: Request, res: Response) => {
  try {
    const status = securityGuard.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Security status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security status'
    });
  }
});

securityGateway.get('/blocked', async (req: Request, res: Response) => {
  try {
    const blocked = securityGuard.getBlockedEntities();
    
    res.json({
      success: true,
      data: {
        count: blocked.length,
        entities: blocked
      }
    });
  } catch (error) {
    console.error('Get blocked entities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get blocked entities'
    });
  }
});

securityGateway.post('/block', async (req: Request, res: Response) => {
  try {
    const { type, value, reason, durationMs } = req.body;

    if (!type || !value || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, value, reason'
      });
    }

    if (type !== 'ip' && type !== 'user') {
      return res.status(400).json({
        success: false,
        error: 'Invalid type. Must be "ip" or "user"'
      });
    }

    securityGuard.blockEntity(type, value, reason, durationMs);

    res.json({
      success: true,
      data: {
        type,
        value,
        reason,
        durationMs: durationMs || 'permanent'
      }
    });
  } catch (error) {
    console.error('Block entity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to block entity'
    });
  }
});

securityGateway.post('/unblock', async (req: Request, res: Response) => {
  try {
    const { type, value } = req.body;

    if (!type || !value) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, value'
      });
    }

    if (type !== 'ip' && type !== 'user') {
      return res.status(400).json({
        success: false,
        error: 'Invalid type. Must be "ip" or "user"'
      });
    }

    const unblocked = securityGuard.unblockEntity(type, value);

    res.json({
      success: true,
      data: {
        unblocked,
        type,
        value
      }
    });
  } catch (error) {
    console.error('Unblock entity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unblock entity'
    });
  }
});

securityGateway.get('/analytics', async (req: Request, res: Response) => {
  try {
    const analytics = securityGuard.getAnalytics();
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Security analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security analytics'
    });
  }
});

securityGateway.post('/rate-limit', async (req: Request, res: Response) => {
  try {
    const { windowMs, maxRequests } = req.body;

    if (!windowMs || !maxRequests) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: windowMs, maxRequests'
      });
    }

    securityGuard.updateRateLimit(windowMs, maxRequests);

    res.json({
      success: true,
      data: {
        windowMs,
        maxRequests
      }
    });
  } catch (error) {
    console.error('Update rate limit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update rate limit'
    });
  }
});

console.log('🛡️ Security API Gateway initialized');

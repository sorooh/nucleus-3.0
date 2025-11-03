import { Router, Request, Response } from 'express';
import { recoveryManager } from '../core/recovery-manager';

export const recoveryGateway = Router();

recoveryGateway.get('/status', async (req: Request, res: Response) => {
  try {
    const status = recoveryManager.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Recovery status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recovery status'
    });
  }
});

recoveryGateway.get('/errors', async (req: Request, res: Response) => {
  try {
    const { severity, limit } = req.query;
    
    const errors = recoveryManager.getErrorLogs(
      severity as 'low' | 'medium' | 'high' | 'critical' | undefined,
      limit ? parseInt(limit as string) : 50
    );
    
    res.json({
      success: true,
      data: {
        count: errors.length,
        errors
      }
    });
  } catch (error) {
    console.error('Get errors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get error logs'
    });
  }
});

recoveryGateway.get('/health', async (req: Request, res: Response) => {
  try {
    const healthStatuses = recoveryManager.getHealthStatuses();
    
    res.json({
      success: true,
      data: {
        count: healthStatuses.length,
        statuses: healthStatuses
      }
    });
  } catch (error) {
    console.error('Get health error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get health statuses'
    });
  }
});

recoveryGateway.get('/recoveries', async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    
    const recoveries = recoveryManager.getRecoveryActions(
      limit ? parseInt(limit as string) : 50
    );
    
    res.json({
      success: true,
      data: {
        count: recoveries.length,
        recoveries
      }
    });
  } catch (error) {
    console.error('Get recoveries error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recovery actions'
    });
  }
});

recoveryGateway.get('/analytics', async (req: Request, res: Response) => {
  try {
    const analytics = recoveryManager.getAnalytics();
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Recovery analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recovery analytics'
    });
  }
});

recoveryGateway.post('/log-error', async (req: Request, res: Response) => {
  try {
    const { severity, source, message, stack, metadata } = req.body;

    if (!severity || !source || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: severity, source, message'
      });
    }

    if (!['low', 'medium', 'high', 'critical'].includes(severity)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid severity. Must be: low, medium, high, or critical'
      });
    }

    recoveryManager.logError({
      severity,
      source,
      message,
      stack,
      metadata
    });

    res.json({
      success: true,
      data: {
        severity,
        source,
        message
      }
    });
  } catch (error) {
    console.error('Log error error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log error'
    });
  }
});

recoveryGateway.post('/update-health', async (req: Request, res: Response) => {
  try {
    const { component, status, message } = req.body;

    if (!component || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: component, status'
      });
    }

    if (!['healthy', 'degraded', 'unhealthy'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: healthy, degraded, or unhealthy'
      });
    }

    recoveryManager.updateHealthStatus(component, status, message);

    res.json({
      success: true,
      data: {
        component,
        status,
        message
      }
    });
  } catch (error) {
    console.error('Update health error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update health status'
    });
  }
});

console.log('🔄 Recovery API Gateway initialized');

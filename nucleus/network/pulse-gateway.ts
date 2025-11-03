/**
 * PULSE GATEWAY - Built from Absolute Zero
 * 
 * REST API for System Pulse Layer
 * Monitor Surooh's heartbeat and mood
 */

import { Router, Request, Response } from 'express';
import { pulseMonitor } from '../core/pulse-monitor';

const router = Router();

// ============= Pulse Data Collection =============

// Report pulse data from child brain
router.post('/report', (req: Request, res: Response) => {
  try {
    const { source, systemLoad, errors, responseTime, ordersVolume, customerFeedback } = req.body;

    if (!source || systemLoad === undefined || errors === undefined || responseTime === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: source, systemLoad, errors, responseTime' 
      });
    }

    pulseMonitor.reportPulseData({
      source,
      systemLoad,
      errors,
      responseTime,
      ordersVolume,
      customerfeedback: customerFeedback
    });

    res.json({
      message: 'Pulse data received',
      source
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============= Pulse Queries =============

// Get current pulse
router.get('/current', (req: Request, res: Response) => {
  try {
    const pulse = pulseMonitor.getCurrentPulse();

    if (!pulse) {
      return res.json({
        message: 'No pulse data available yet',
        mood: 'Unknown'
      });
    }

    res.json({
      mood: pulse.mood,
      loadIndex: pulse.loadIndex,
      stressLevel: pulse.stressLevel,
      recommendation: pulse.recommendation,
      timestamp: pulse.timestamp,
      sources: pulse.sources,
      metrics: pulse.metrics
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get pulse history
router.get('/history', (req: Request, res: Response) => {
  try {
    const { hours } = req.query;
    const history = pulseMonitor.getPulseHistory(
      hours ? parseInt(hours as string) : 24
    );

    res.json({
      count: history.length,
      history: history.map(h => ({
        timestamp: h.timestamp,
        mood: h.mood,
        loadIndex: h.loadIndex,
        stressLevel: h.stressLevel
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get analytics
router.get('/analytics', (req: Request, res: Response) => {
  try {
    const analytics = pulseMonitor.getAnalytics();
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get status
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = pulseMonitor.getStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============= Management =============

// Activate pulse monitor
router.post('/activate', (req: Request, res: Response) => {
  try {
    const { intervalMs } = req.body;
    pulseMonitor.activate(intervalMs);
    
    res.json({ 
      message: 'Pulse Monitor activated',
      interval: intervalMs || '5 minutes'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Deactivate pulse monitor
router.post('/deactivate', (req: Request, res: Response) => {
  try {
    pulseMonitor.deactivate();
    res.json({ message: 'Pulse Monitor deactivated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Clear history
router.post('/clear-history', (req: Request, res: Response) => {
  try {
    pulseMonitor.clearHistory();
    res.json({ message: 'Pulse history cleared' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Clear data source
router.post('/clear-source', (req: Request, res: Response) => {
  try {
    const { source } = req.body;

    if (!source) {
      return res.status(400).json({ error: 'Missing source' });
    }

    const cleared = pulseMonitor.clearDataSource(source);

    if (!cleared) {
      return res.status(404).json({ error: 'Source not found' });
    }

    res.json({
      message: 'Source data cleared',
      source
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

console.log('💓 Pulse API Gateway initialized');

export default router;

/**
 * Connector Gateway - External Intelligence Feed System
 * Built from absolute zero - zero templates
 * 
 * REST API for managing external connectors
 */

import { Router, Request, Response } from 'express';
import { connectorManager } from './connector-manager';

const router = Router();

/**
 * GET /api/connectors/status
 * Get connector manager status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = connectorManager.getStatus();
    res.json(status);
  } catch (error: any) {
    console.error('[ConnectorGateway] Status error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/connectors/stats
 * Get all connector stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = connectorManager.getAllStats();
    res.json({ stats });
  } catch (error: any) {
    console.error('[ConnectorGateway] Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/connectors/:id/stats
 * Get specific connector stats
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const stats = connectorManager.getConnectorStats(id);
    
    if (!stats) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    res.json(stats);
  } catch (error: any) {
    console.error('[ConnectorGateway] Connector stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/connectors/:id/run
 * Run a specific connector manually
 */
router.post('/:id/run', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await connectorManager.runConnector(id);
    
    if (!result) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    res.json({
      message: result.success ? 'Connector executed successfully' : 'Connector execution failed',
      result
    });
  } catch (error: any) {
    console.error('[ConnectorGateway] Run connector error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/connectors/start
 * Start all connectors
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    await connectorManager.start();
    res.json({ message: 'All connectors started' });
  } catch (error: any) {
    console.error('[ConnectorGateway] Start error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/connectors/stop
 * Stop all connectors
 */
router.post('/stop', async (req: Request, res: Response) => {
  try {
    connectorManager.stop();
    res.json({ message: 'All connectors stopped' });
  } catch (error: any) {
    console.error('[ConnectorGateway] Stop error:', error);
    res.status(500).json({ error: error.message });
  }
});

console.log('🔌 Connector API Gateway initialized');

export default router;

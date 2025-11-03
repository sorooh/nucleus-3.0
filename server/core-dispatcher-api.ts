/**
 * 🧠 Core Dispatcher API - Smart Task Distribution
 * نواة التوزيع الذكي - اختيار البوت المناسب وتنفيذ المهام
 */

import { Router } from 'express';
import { coreDispatcher } from './core-dispatcher-wrapper';

const router = Router();

/**
 * POST /api/core/dispatch
 * توزيع المهمة على البوت المناسب
 */
router.post('/dispatch', async (req, res) => {
  try {
    const { task, payload } = req.body;

    if (!task) {
      return res.status(400).json({
        success: false,
        error: 'Task is required'
      });
    }

    console.log(`📥 Core Dispatcher: Dispatching task: ${task}`);
    
    const result = await coreDispatcher.dispatch({
      task,
      payload: payload || {}
    });

    console.log(`✅ Core Dispatcher: Task ${task} completed`);
    
    res.json(result);
  } catch (error: any) {
    console.error('❌ Core Dispatcher error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to dispatch task'
    });
  }
});

/**
 * GET /api/core/health
 * فحص صحة النظام
 */
router.get('/health', async (req, res) => {
  try {
    const health = await coreDispatcher.healthCheck();
    res.json(health);
  } catch (error: any) {
    console.error('❌ Core health check error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Health check failed'
    });
  }
});

export default router;

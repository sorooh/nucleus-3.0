import { Router } from 'express';
import { getGPUController } from './gpu-control';
import { OllamaProvider } from './providers/ollama';

const router = Router();

/**
 * GET /api/gpu/status
 * Get GPU Pod status
 */
router.get('/status', async (req, res) => {
  try {
    const controller = getGPUController();
    
    if (!controller.isConfigured()) {
      return res.json({
        success: false,
        error: 'GPU controller not configured (missing RUNPOD_API_KEY or POD_ID)',
        data: { status: 'NOT_CONFIGURED' }
      });
    }

    const status = await controller.getStatus();
    const info = controller.getInfo();

    res.json({
      success: true,
      data: {
        ...status,
        config: info
      }
    });
  } catch (error: any) {
    console.error('[GPU API] Status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/gpu/discover-port
 * Auto-discover Ollama external port from RunPod
 */
router.get('/discover-port', async (req, res) => {
  try {
    const controller = getGPUController();
    
    if (!controller.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'GPU controller not configured'
      });
    }

    const externalPort = await controller.getOllamaExternalPort();

    if (externalPort) {
      const podId = process.env.POD_ID || '';
      const discoveredUrl = `https://${podId}-${externalPort}.proxy.runpod.net`;
      
      res.json({
        success: true,
        data: {
          externalPort,
          ollamaUrl: discoveredUrl,
          message: `✅ Found Ollama on external port ${externalPort}`,
          instruction: `Update OLLAMA_BASE_URL secret to: ${discoveredUrl}`
        }
      });
    } else {
      res.json({
        success: false,
        error: 'Port 11434 not exposed on RunPod. Please expose it in Pod settings.',
        data: {
          privatePort: 11434,
          found: false
        }
      });
    }
  } catch (error: any) {
    console.error('[GPU API] Discover port error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/gpu/start
 * Start (resume) GPU Pod
 */
router.post('/start', async (req, res) => {
  try {
    const controller = getGPUController();
    
    if (!controller.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'GPU controller not configured'
      });
    }

    const started = await controller.start();

    if (started) {
      res.json({
        success: true,
        message: 'GPU Pod started successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to start GPU Pod'
      });
    }
  } catch (error: any) {
    console.error('[GPU API] Start error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/gpu/stop
 * Stop GPU Pod (to save costs)
 */
router.post('/stop', async (req, res) => {
  try {
    const controller = getGPUController();
    
    if (!controller.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'GPU controller not configured'
      });
    }

    const stopped = await controller.stop();

    if (stopped) {
      res.json({
        success: true,
        message: 'GPU Pod stopped successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to stop GPU Pod'
      });
    }
  } catch (error: any) {
    console.error('[GPU API] Stop error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/gpu/generate
 * Generate text using Ollama (auto-starts GPU if needed)
 */
router.post('/generate', async (req, res) => {
  try {
    const { prompt, systemPrompt, maxTokens, temperature } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'prompt is required'
      });
    }

    const controller = getGPUController();
    
    // Ensure GPU is running (auto-start if needed)
    if (controller.isConfigured()) {
      console.log('[GPU API] Ensuring GPU is running...');
      const running = await controller.ensureRunning();
      
      if (!running) {
        return res.status(503).json({
          success: false,
          error: 'GPU Pod is not running and could not be started'
        });
      }

      // Record usage and start idle timer
      controller.recordUsage();
      console.log('[GPU API] ✅ Usage recorded - idle timer started');
    }

    // Generate using Ollama
    const ollama = new OllamaProvider();
    const response = await ollama.generateResponse(prompt, {
      systemPrompt,
      maxTokens,
      temperature
    });

    res.json({
      success: true,
      data: {
        response,
        model: ollama.getModel(),
        provider: 'Ollama (Self-hosted)'
      }
    });
  } catch (error: any) {
    console.error('[GPU API] Generate error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/gpu/health
 * Check Ollama health
 */
router.get('/health', async (req, res) => {
  try {
    const ollama = new OllamaProvider();
    const healthy = await ollama.healthCheck();

    if (healthy) {
      const models = await ollama.listModels();
      const info = ollama.getModelInfo();

      res.json({
        success: true,
        data: {
          healthy: true,
          models,
          info
        }
      });
    } else {
      res.status(503).json({
        success: false,
        error: 'Ollama is not responding'
      });
    }
  } catch (error: any) {
    console.error('[GPU API] Health check error:', error);
    res.status(503).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/gpu/info
 * Get GPU configuration info
 */
router.get('/info', async (req, res) => {
  try {
    const controller = getGPUController();
    const ollama = new OllamaProvider();

    res.json({
      success: true,
      data: {
        gpu: controller.getInfo(),
        ollama: {
          baseURL: ollama.getBaseURL(),
          model: ollama.getModel(),
          info: ollama.getModelInfo()
        }
      }
    });
  } catch (error: any) {
    console.error('[GPU API] Info error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/gpu/idle-status
 * Get GPU idle status (for monitoring auto-shutdown)
 */
router.get('/idle-status', async (req, res) => {
  try {
    const controller = getGPUController();
    
    if (!controller.isConfigured()) {
      return res.json({
        success: false,
        error: 'GPU controller not configured',
        data: { enabled: false }
      });
    }

    const idleStatus = controller.getIdleStatus();
    const gpuStatus = await controller.getStatus();

    res.json({
      success: true,
      data: {
        enabled: true,
        podStatus: gpuStatus.status,
        ...idleStatus
      }
    });
  } catch (error: any) {
    console.error('[GPU API] Idle status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

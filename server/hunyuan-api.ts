import { Router } from 'express';
import { HunyuanProvider } from './ai/providers/hunyuan';

const router = Router();

router.post("/test", async (req, res) => {
  try {
    const { prompt, systemPrompt, thinkingBudget } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    const hunyuan = new HunyuanProvider();
    const startTime = Date.now();

    const response = await hunyuan.generateResponse(prompt, {
      systemPrompt: systemPrompt || 'You are a helpful AI assistant powered by Hunyuan-A13B.',
      thinkingBudget: thinkingBudget || 1024,
      maxTokens: 4096
    });

    const responseTime = Date.now() - startTime;

    res.json({
      success: true,
      response,
      metadata: {
        model: 'Hunyuan-A13B-Instruct',
        provider: 'SiliconFlow',
        responseTime: `${responseTime}ms`,
        thinkingBudget: thinkingBudget || 1024
      }
    });
  } catch (error: any) {
    console.error('[Hunyuan Test] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get("/info", async (req, res) => {
  try {
    const hunyuan = new HunyuanProvider();
    const info = hunyuan.getModelInfo();

    res.json({
      success: true,
      info
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post("/chat", async (req, res) => {
  try {
    const { messages, maxTokens, temperature, thinkingBudget } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required'
      });
    }

    const hunyuan = new HunyuanProvider();
    const response = await hunyuan.chat(messages, {
      maxTokens: maxTokens || 4096,
      temperature: temperature || 0.7,
      thinkingBudget: thinkingBudget || 1024
    });

    res.json({
      success: true,
      ...response
    });
  } catch (error: any) {
    console.error('[Hunyuan Chat] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

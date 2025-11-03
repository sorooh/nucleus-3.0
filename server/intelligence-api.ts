/**
 * INTELLIGENCE API - واجهة النظام الذكي
 * 
 * REST API for Nucleus Intelligence System
 * - Feedback Loop
 * - Vector Memory
 * - Shared Learning
 */

import { Router } from 'express';
import { intelligence } from '../nucleus/intelligence';
import { aiProviders } from '../nucleus/intelligence/ai-providers';

const router = Router();

// ============= Model Testing =============

router.post('/test-model', async (req, res) => {
  try {
    const { model, message } = req.body;

    if (!model || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: model, message'
      });
    }

    const provider = aiProviders.getProvider(model);
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: `Model "${model}" not found or not configured`
      });
    }

    const startTime = Date.now();
    const response = await provider.generate(message);
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      model: response.model,
      response: response.content,
      usage: response.usage,
      duration
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/models', async (req, res) => {
  try {
    const availableModels = aiProviders.getAvailableProviders();
    res.json({
      success: true,
      models: availableModels,
      total: availableModels.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= Initialization =============

router.get('/status', async (req, res) => {
  try {
    const stats = await intelligence.getStats();
    
    res.json({
      success: true,
      initialized: intelligence.isInitialized(),
      stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await intelligence.getStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= Feedback Loop Endpoints =============

router.post('/decision/log', async (req, res) => {
  try {
    const { type, source, context, decision, confidence } = req.body;

    if (!type || !source || !context || !decision) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, source, context, decision'
      });
    }

    const result = await intelligence.logDecision({
      type,
      source,
      context,
      decision,
      confidence
    });

    res.json({
      success: true,
      decision: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/decision/feedback', async (req, res) => {
  try {
    const { decisionId, outcome, success, impact } = req.body;

    if (!decisionId || !outcome || !success || impact === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: decisionId, outcome, success, impact'
      });
    }

    const result = await intelligence.recordFeedback({
      decisionId,
      outcome,
      success,
      impact
    });

    res.json({
      success: true,
      feedback: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= Vector Memory Endpoints =============

router.get('/memory', async (req, res) => {
  try {
    const stats = await intelligence.getStats();
    
    res.json({
      success: true,
      memory: {
        count: stats.vector?.totalMemories || 0,
        categories: stats.vector?.categoryCounts || {}
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/memory/store', async (req, res) => {
  try {
    const { content, category, source } = req.body;

    if (!content || !category || !source) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: content, category, source'
      });
    }

    const memoryId = await intelligence.storeMemory({
      content,
      category,
      source
    });

    res.json({
      success: true,
      memoryId
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/memory/search', async (req, res) => {
  try {
    const { query, limit } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: query'
      });
    }

    const results = await intelligence.searchMemory(query, limit || 5);

    res.json({
      success: true,
      results
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= Shared Learning Endpoints =============

router.post('/learning/contribute', async (req, res) => {
  try {
    const { botId, botName, category, pattern, description, examples, confidence } = req.body;

    if (!botId || !botName || !category || !pattern || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: botId, botName, category, pattern, description'
      });
    }

    await intelligence.contributeKnowledge({
      botId,
      botName,
      category,
      pattern,
      description,
      examples: examples || [],
      confidence: confidence || 50
    });

    res.json({
      success: true,
      message: 'Knowledge contribution recorded'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/learning/knowledge/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const knowledge = await intelligence.getSharedKnowledge(category);

    res.json({
      success: true,
      knowledge
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/learning/stats', async (req, res) => {
  try {
    const stats = await intelligence.getStats();

    res.json({
      success: true,
      stats: stats.learning
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= Smart Reports Endpoint =============

router.get('/reports/smart', async (req, res) => {
  try {
    const report = await intelligence.generateSmartReport();

    res.json({
      success: true,
      report
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= Academic Hub Endpoints =============

router.post('/academic/search', async (req, res) => {
  try {
    const { query, limit } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    const results = await intelligence.searchAcademic(query, limit);

    res.json({
      success: true,
      results,
      count: results.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/academic/store', async (req, res) => {
  try {
    const { title, content, category, authors, keywords, year } = req.body;

    if (!title || !content || !category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, content, category'
      });
    }

    await intelligence.storeAcademicContent({
      title,
      content,
      category,
      authors,
      keywords,
      year
    });

    res.json({
      success: true,
      message: 'Academic content stored successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/academic/recommendations', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    const recommendations = await intelligence.getTopicRecommendations(query);

    res.json({
      success: true,
      recommendations
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/academic/trends', async (req, res) => {
  try {
    const trends = await intelligence.getAcademicTrends();

    res.json({
      success: true,
      trends
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= Self-Learning Endpoints =============

router.post('/self-learning/outcome', async (req, res) => {
  try {
    const { decisionId, input, decision, outcome, feedback, metrics } = req.body;

    if (!decisionId || !input || !decision || !outcome) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: decisionId, input, decision, outcome'
      });
    }

    const { selfLearning } = await import('../nucleus/intelligence/self-learning');
    selfLearning.recordOutcome({ decisionId, input, decision, outcome, feedback, metrics });

    res.json({
      success: true,
      message: 'Outcome recorded for learning'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/self-learning/insights', async (req, res) => {
  try {
    const { selfLearning } = await import('../nucleus/intelligence/self-learning');
    const insights = selfLearning.getInsights();

    res.json({
      success: true,
      insights
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/self-learning/status', async (req, res) => {
  try {
    const { selfLearning } = await import('../nucleus/intelligence/self-learning');
    const status = selfLearning.getStatus();

    res.json({
      success: true,
      status
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= Memory Consolidation Endpoints =============

router.post('/memory-consolidation/consolidate', async (req, res) => {
  try {
    const { memoryConsolidation } = await import('../nucleus/intelligence/memory-consolidation');
    await memoryConsolidation.consolidate();

    res.json({
      success: true,
      message: 'Memory consolidation completed'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/memory-consolidation/insights', async (req, res) => {
  try {
    const { memoryConsolidation } = await import('../nucleus/intelligence/memory-consolidation');
    const insights = memoryConsolidation.getInsights();

    res.json({
      success: true,
      insights
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/memory-consolidation/status', async (req, res) => {
  try {
    const { memoryConsolidation } = await import('../nucleus/intelligence/memory-consolidation');
    const status = memoryConsolidation.getStatus();

    res.json({
      success: true,
      status
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= Predictive Intelligence Endpoints =============

router.post('/predictive/predict', async (req, res) => {
  try {
    const { predictiveIntelligence } = await import('../nucleus/intelligence/predictive-intelligence');
    const predictions = await predictiveIntelligence.predict();

    res.json({
      success: true,
      predictions
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/predictive/validate', async (req, res) => {
  try {
    const { predictionId, outcome, accuracy } = req.body;

    if (!predictionId || !outcome || accuracy === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: predictionId, outcome, accuracy'
      });
    }

    const { predictiveIntelligence } = await import('../nucleus/intelligence/predictive-intelligence');
    predictiveIntelligence.validatePrediction(predictionId, outcome, accuracy);

    res.json({
      success: true,
      message: 'Prediction validated'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/predictive/insights', async (req, res) => {
  try {
    const { predictiveIntelligence } = await import('../nucleus/intelligence/predictive-intelligence');
    const insights = predictiveIntelligence.getInsights();

    res.json({
      success: true,
      insights
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/predictive/status', async (req, res) => {
  try {
    const { predictiveIntelligence } = await import('../nucleus/intelligence/predictive-intelligence');
    const status = predictiveIntelligence.getStatus();

    res.json({
      success: true,
      status
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= Meta-Learning Endpoints =============

router.post('/meta-learning/recommend-strategy', async (req, res) => {
  try {
    const { task, context } = req.body;

    if (!task) {
      return res.status(400).json({
        success: false,
        error: 'Task is required'
      });
    }

    const { metaLearning } = await import('../nucleus/intelligence/meta-learning');
    const recommendation = await metaLearning.recommendStrategy(task, context);

    res.json({
      success: true,
      recommendation
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/meta-learning/session/start', async (req, res) => {
  try {
    const { task, strategyId } = req.body;

    if (!task) {
      return res.status(400).json({
        success: false,
        error: 'Task is required'
      });
    }

    const { metaLearning } = await import('../nucleus/intelligence/meta-learning');
    const sessionId = metaLearning.startSession(task, strategyId);

    res.json({
      success: true,
      sessionId
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/meta-learning/session/end', async (req, res) => {
  try {
    const { sessionId, performance, outcome, insights } = req.body;

    if (!sessionId || performance === undefined || !outcome) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sessionId, performance, outcome'
      });
    }

    const { metaLearning } = await import('../nucleus/intelligence/meta-learning');
    metaLearning.endSession(sessionId, performance, outcome, insights);

    res.json({
      success: true,
      message: 'Session ended and recorded'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/meta-learning/insights', async (req, res) => {
  try {
    const { metaLearning } = await import('../nucleus/intelligence/meta-learning');
    const insights = metaLearning.getInsights();

    res.json({
      success: true,
      insights
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/meta-learning/status', async (req, res) => {
  try {
    const { metaLearning } = await import('../nucleus/intelligence/meta-learning');
    const status = metaLearning.getStatus();

    res.json({
      success: true,
      status
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= Autonomous Reasoning Endpoints =============

router.post('/autonomous/reason', async (req, res) => {
  try {
    const { trigger, context } = req.body;

    if (!trigger) {
      return res.status(400).json({
        success: false,
        error: 'Trigger is required'
      });
    }

    const { autonomousReasoning } = await import('../nucleus/intelligence/autonomous-reasoning');
    const chain = await autonomousReasoning.reason(trigger, context);

    res.json({
      success: true,
      reasoning: chain
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/autonomous/set-goals', async (req, res) => {
  try {
    const { autonomousReasoning } = await import('../nucleus/intelligence/autonomous-reasoning');
    await autonomousReasoning.setGoals();

    res.json({
      success: true,
      message: 'Autonomous goals set'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/autonomous/execute-actions', async (req, res) => {
  try {
    const { autonomousReasoning } = await import('../nucleus/intelligence/autonomous-reasoning');
    const executed = await autonomousReasoning.executeActions();

    res.json({
      success: true,
      executed,
      message: `Executed ${executed} actions`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/autonomous/autonomy-level', async (req, res) => {
  try {
    const { level } = req.body;

    if (level === undefined || level < 0 || level > 1) {
      return res.status(400).json({
        success: false,
        error: 'Level must be between 0 and 1'
      });
    }

    const { autonomousReasoning } = await import('../nucleus/intelligence/autonomous-reasoning');
    autonomousReasoning.setAutonomyLevel(level);

    res.json({
      success: true,
      message: `Autonomy level set to ${Math.round(level * 100)}%`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/autonomous/insights', async (req, res) => {
  try {
    const { autonomousReasoning } = await import('../nucleus/intelligence/autonomous-reasoning');
    const insights = autonomousReasoning.getInsights();

    res.json({
      success: true,
      insights
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/autonomous/status', async (req, res) => {
  try {
    const { autonomousReasoning } = await import('../nucleus/intelligence/autonomous-reasoning');
    const status = autonomousReasoning.getStatus();

    res.json({
      success: true,
      status
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= AI Distribution - Llama 3.3 70B Sharing =============

router.post('/distribute-ai', async (req, res) => {
  try {
    const { intelligenceDistributor } = await import('../nucleus/intelligence/distributor');
    const result = await intelligenceDistributor.distributeAICapabilities();

    res.json({
      success: result.success,
      data: {
        platforms: result.platforms,
        endpoint: result.endpoint,
        model: result.model,
        totalPlatforms: result.platforms.length,
        message: 'AI capabilities distributed to all Surooh platforms'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/ai-distribution/stats', async (req, res) => {
  try {
    const { intelligenceDistributor } = await import('../nucleus/intelligence/distributor');
    const stats = intelligenceDistributor.getStats();

    res.json({
      success: true,
      stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

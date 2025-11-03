/**
 * LAYERS MANAGER - مدير طبقات الوعي الذكي
 * 
 * Manages the 4 Nucleus 3.0 Conscious Intelligence Layers:
 * - Cognitive Mirror
 * - Emotional Logic
 * - Swarm Intelligence
 * - Strategic Foresight
 */

import { EventEmitter } from 'events';
import { cognitiveMirror } from './cognitive-mirror';
import { emotionalLogic } from './emotional-logic';
import { swarmIntelligence } from './swarm-intelligence';
import { strategicForesight } from './strategic-foresight';

interface LayerConfig {
  cognitive_mirror?: {
    reflection_window?: number;
    min_confidence?: number;
  };
  emotional_logic?: {
    sentiment?: boolean;
    intent?: boolean;
    deescalation?: boolean;
  };
  swarm_intelligence?: {
    quorum?: number;
    voting?: 'simple' | 'weighted' | 'unanimous';
    timeout_ms?: number;
  };
  strategic_foresight?: {
    horizons?: number[];
    scenarios?: number;
    risk_budget?: number;
  };
}

interface EnableLayersRequest {
  enable: boolean;
  layers: Array<{
    name: string;
    params: any;
  }>;
  dry_run?: boolean;
}

class LayersManager extends EventEmitter {
  private initialized: boolean = false;
  private enabledLayers: Set<string> = new Set();

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[LayersManager] Already initialized');
      return;
    }

    console.log('🧬 [LayersManager] Initializing Nucleus 3.0 Conscious Intelligence Layers...');

    this.setupEventListeners();

    this.initialized = true;
    console.log('✅ [LayersManager] Layers management system ready');
  }

  private setupEventListeners(): void {
    cognitiveMirror.on('meta-feedback-generated', (data) => {
      this.emit('layer-event', {
        layer: 'cognitive_mirror',
        event: 'meta-feedback-generated',
        data
      });
    });

    emotionalLogic.on('high-tension-detected', (data) => {
      this.emit('layer-event', {
        layer: 'emotional_logic',
        event: 'high-tension-detected',
        data
      });
    });

    swarmIntelligence.on('decision-finalized', (data) => {
      this.emit('layer-event', {
        layer: 'swarm_intelligence',
        event: 'decision-finalized',
        data
      });
    });

    strategicForesight.on('forecast-generated', (data) => {
      this.emit('layer-event', {
        layer: 'strategic_foresight',
        event: 'forecast-generated',
        data
      });
    });
  }

  async enableLayers(request: EnableLayersRequest): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (request.dry_run) {
      console.log('[LayersManager] DRY RUN - Would enable layers:', request.layers.map(l => l.name));
      return {
        success: true,
        dry_run: true,
        layers: request.layers.map(l => ({ name: l.name, status: 'would_enable' }))
      };
    }

    const results = [];

    for (const layerConfig of request.layers) {
      try {
        const result = await this.enableLayer(layerConfig.name, layerConfig.params);
        results.push(result);
      } catch (error: any) {
        results.push({
          name: layerConfig.name,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: results.every(r => r.success),
      layers: results
    };
  }

  private async enableLayer(name: string, params: any): Promise<any> {
    switch (name) {
      case 'cognitive_mirror':
        cognitiveMirror.activate(params);
        this.enabledLayers.add('cognitive_mirror');
        return {
          name: 'cognitive_mirror',
          success: true,
          status: 'active',
          config: params
        };

      case 'emotional_logic':
        emotionalLogic.activate(params);
        this.enabledLayers.add('emotional_logic');
        return {
          name: 'emotional_logic',
          success: true,
          status: 'active',
          config: params
        };

      case 'swarm_intelligence':
        swarmIntelligence.activate(params);
        this.enabledLayers.add('swarm_intelligence');
        return {
          name: 'swarm_intelligence',
          success: true,
          status: 'active',
          config: params
        };

      case 'strategic_foresight':
        strategicForesight.activate(params);
        this.enabledLayers.add('strategic_foresight');
        return {
          name: 'strategic_foresight',
          success: true,
          status: 'active',
          config: params
        };

      default:
        throw new Error(`Unknown layer: ${name}`);
    }
  }

  getStatus(): any {
    return {
      initialized: this.initialized,
      enabledLayers: Array.from(this.enabledLayers),
      layers: {
        cognitive_mirror: {
          enabled: this.enabledLayers.has('cognitive_mirror'),
          status: this.enabledLayers.has('cognitive_mirror') 
            ? cognitiveMirror.getStatus()
            : null
        },
        emotional_logic: {
          enabled: this.enabledLayers.has('emotional_logic'),
          status: this.enabledLayers.has('emotional_logic')
            ? emotionalLogic.getStatus()
            : null
        },
        swarm_intelligence: {
          enabled: this.enabledLayers.has('swarm_intelligence'),
          status: this.enabledLayers.has('swarm_intelligence')
            ? swarmIntelligence.getStatus()
            : null
        },
        strategic_foresight: {
          enabled: this.enabledLayers.has('strategic_foresight'),
          status: this.enabledLayers.has('strategic_foresight')
            ? strategicForesight.getStatus()
            : null
        }
      }
    };
  }

  isEnabled(layerName: string): boolean {
    return this.enabledLayers.has(layerName);
  }

  async reflectOnDecision(decision: {
    id: string;
    content: string;
    confidence: number;
    outcome?: string;
  }): Promise<any> {
    if (!this.isEnabled('cognitive_mirror')) {
      return null;
    }

    return await cognitiveMirror.reflect(decision);
  }

  async analyzeEmotion(input: string, metadata?: any): Promise<any> {
    if (!this.isEnabled('emotional_logic')) {
      return null;
    }

    return await emotionalLogic.analyze(input, metadata);
  }

  async proposeSwarmDecision(question: string, metadata?: any): Promise<string | null> {
    if (!this.isEnabled('swarm_intelligence')) {
      return null;
    }

    return await swarmIntelligence.proposeDecision(question, metadata);
  }

  async castSwarmVote(decisionId: string, vote: any): Promise<boolean> {
    if (!this.isEnabled('swarm_intelligence')) {
      return false;
    }

    return await swarmIntelligence.castVote(decisionId, vote);
  }

  async generateForecast(question: string, horizon?: number, metadata?: any): Promise<any> {
    if (!this.isEnabled('strategic_foresight')) {
      return null;
    }

    return await strategicForesight.generateForecast(question, horizon, metadata);
  }

  getCognitiveMirror() {
    return cognitiveMirror;
  }

  getEmotionalLogic() {
    return emotionalLogic;
  }

  getSwarmIntelligence() {
    return swarmIntelligence;
  }

  getStrategicForesight() {
    return strategicForesight;
  }
}

export const layersManager = new LayersManager();

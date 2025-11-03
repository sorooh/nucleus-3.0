/**
 * Decision Graph Engine - Phase 9.8
 * محرك تحليل العلاقات بين القرارات المتداخلة
 * 
 * يبني خريطة (Graph) للقرارات المترابطة من نوى مختلفة
 * ويقيّم تأثير كل قرار على بقية النظام
 */

import crypto from 'crypto';

/**
 * Node Decision Structure
 */
export interface NodeDecision {
  nodeId: string;
  nodeName: string;
  decisionType: string;
  payload: any;
  confidence: number;
  expectedImpact: number;
  priority?: number;
  dependencies?: string[]; // nodeIds that this decision depends on
  conflicts?: string[]; // nodeIds that this decision conflicts with
}

/**
 * Decision Graph Node
 */
interface GraphNode {
  nodeId: string;
  decision: NodeDecision;
  weight: number; // Based on confidence + impact
  connections: {
    nodeId: string;
    relationshipType: 'supports' | 'conflicts' | 'depends' | 'neutral';
    strength: number; // 0.0 - 1.0
  }[];
}

/**
 * Decision Graph
 */
export interface DecisionGraph {
  nodes: GraphNode[];
  totalWeight: number;
  interconnections: number;
  conflictCount: number;
  supportCount: number;
  timestamp: string;
}

/**
 * Graph Analysis Result
 */
export interface GraphAnalysisResult {
  graph: DecisionGraph;
  conflictLevel: number; // 0.0 - 1.0
  coherenceScore: number; // 0.0 - 1.0
  criticalNodes: string[]; // High-impact nodes
  conflictingPairs: Array<{ node1: string; node2: string; reason: string }>;
  recommendations: string[];
}

/**
 * Decision Graph Engine Class
 */
export class DecisionGraphEngine {
  private config = {
    minConfidence: 0.3,
    minImpact: 0.2,
    conflictThreshold: 0.5
  };

  constructor() {
    console.log('[DecisionGraphEngine] Initialized');
  }

  /**
   * Build decision graph from node decisions
   */
  buildGraph(decisions: NodeDecision[]): DecisionGraph {
    console.log(`[DecisionGraphEngine] Building graph from ${decisions.length} decisions`);
    
    const nodes: GraphNode[] = [];
    let totalWeight = 0;
    let interconnections = 0;
    let conflictCount = 0;
    let supportCount = 0;
    
    // Create graph nodes
    for (const decision of decisions) {
      const weight = this.calculateWeight(decision);
      totalWeight += weight;
      
      const graphNode: GraphNode = {
        nodeId: decision.nodeId,
        decision,
        weight,
        connections: []
      };
      
      nodes.push(graphNode);
    }
    
    // Analyze relationships between nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];
        
        const relationship = this.analyzeRelationship(
          node1.decision,
          node2.decision
        );
        
        if (relationship.type !== 'neutral') {
          // Add connection to node1
          node1.connections.push({
            nodeId: node2.nodeId,
            relationshipType: relationship.type,
            strength: relationship.strength
          });
          
          // Add reciprocal connection to node2
          node2.connections.push({
            nodeId: node1.nodeId,
            relationshipType: relationship.type,
            strength: relationship.strength
          });
          
          interconnections++;
          
          if (relationship.type === 'conflicts') {
            conflictCount++;
          } else if (relationship.type === 'supports') {
            supportCount++;
          }
        }
      }
    }
    
    return {
      nodes,
      totalWeight,
      interconnections,
      conflictCount,
      supportCount,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analyze complete graph and provide insights
   */
  analyzeGraph(graph: DecisionGraph): GraphAnalysisResult {
    console.log('[DecisionGraphEngine] Analyzing graph...');
    
    // Calculate conflict level
    const conflictLevel = graph.interconnections > 0
      ? graph.conflictCount / graph.interconnections
      : 0;
    
    // Calculate coherence score (how well decisions align)
    const coherenceScore = graph.interconnections > 0
      ? graph.supportCount / graph.interconnections
      : 1.0;
    
    // Identify critical nodes (high weight)
    const criticalNodes = graph.nodes
      .filter(n => n.weight > 0.7)
      .map(n => n.nodeId)
      .sort((a, b) => {
        const weightA = graph.nodes.find(n => n.nodeId === a)?.weight || 0;
        const weightB = graph.nodes.find(n => n.nodeId === b)?.weight || 0;
        return weightB - weightA;
      });
    
    // Identify conflicting pairs
    const conflictingPairs: Array<{ node1: string; node2: string; reason: string }> = [];
    for (const node of graph.nodes) {
      for (const conn of node.connections) {
        if (conn.relationshipType === 'conflicts') {
          const otherNode = graph.nodes.find(n => n.nodeId === conn.nodeId);
          if (otherNode) {
            conflictingPairs.push({
              node1: node.nodeId,
              node2: conn.nodeId,
              reason: this.getConflictReason(node.decision, otherNode.decision)
            });
          }
        }
      }
    }
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      graph,
      conflictLevel,
      coherenceScore,
      criticalNodes
    );
    
    console.log(`[DecisionGraphEngine] Analysis complete:`);
    console.log(`  Conflict Level: ${conflictLevel.toFixed(2)}`);
    console.log(`  Coherence Score: ${coherenceScore.toFixed(2)}`);
    console.log(`  Critical Nodes: ${criticalNodes.length}`);
    console.log(`  Conflicting Pairs: ${conflictingPairs.length}`);
    
    return {
      graph,
      conflictLevel,
      coherenceScore,
      criticalNodes,
      conflictingPairs,
      recommendations
    };
  }

  /**
   * Calculate weight for a decision (confidence + impact)
   */
  private calculateWeight(decision: NodeDecision): number {
    const confidence = decision.confidence || 0.5;
    const impact = decision.expectedImpact || 0.5;
    const priority = decision.priority || 1;
    
    // Weighted formula: 60% confidence + 40% impact, scaled by priority
    return ((confidence * 0.6) + (impact * 0.4)) * priority;
  }

  /**
   * Analyze relationship between two decisions
   */
  private analyzeRelationship(
    decision1: NodeDecision,
    decision2: NodeDecision
  ): { type: 'supports' | 'conflicts' | 'depends' | 'neutral'; strength: number } {
    // Check explicit dependencies
    if (decision1.dependencies?.includes(decision2.nodeId)) {
      return { type: 'depends', strength: 0.9 };
    }
    
    // Check explicit conflicts
    if (decision1.conflicts?.includes(decision2.nodeId)) {
      return { type: 'conflicts', strength: 0.9 };
    }
    
    // Analyze decision type compatibility
    if (decision1.decisionType === decision2.decisionType) {
      // Same type decisions often support each other
      return { type: 'supports', strength: 0.6 };
    }
    
    // Check for opposing decision types
    const opposingTypes: { [key: string]: string[] } = {
      'scale-up': ['scale-down', 'reduce-resources'],
      'scale-down': ['scale-up', 'increase-capacity'],
      'increase-security': ['reduce-restrictions'],
      'optimize-speed': ['optimize-security'], // May conflict
    };
    
    if (opposingTypes[decision1.decisionType]?.includes(decision2.decisionType)) {
      return { type: 'conflicts', strength: 0.7 };
    }
    
    // Analyze payload compatibility (simplified)
    const payloadSimilarity = this.calculatePayloadSimilarity(
      decision1.payload,
      decision2.payload
    );
    
    if (payloadSimilarity > 0.7) {
      return { type: 'supports', strength: payloadSimilarity };
    } else if (payloadSimilarity < 0.3) {
      return { type: 'conflicts', strength: 1 - payloadSimilarity };
    }
    
    return { type: 'neutral', strength: 0.5 };
  }

  /**
   * Calculate similarity between two payloads
   */
  private calculatePayloadSimilarity(payload1: any, payload2: any): number {
    if (!payload1 || !payload2) return 0.5;
    
    try {
      const keys1 = Object.keys(payload1);
      const keys2 = Object.keys(payload2);
      
      // Compare keys
      const commonKeys = keys1.filter(k => keys2.includes(k));
      const keySimilarity = commonKeys.length / Math.max(keys1.length, keys2.length);
      
      // Compare values for common keys
      let valueSimilarity = 0;
      for (const key of commonKeys) {
        if (payload1[key] === payload2[key]) {
          valueSimilarity += 1;
        }
      }
      valueSimilarity = commonKeys.length > 0 ? valueSimilarity / commonKeys.length : 0;
      
      return (keySimilarity * 0.4) + (valueSimilarity * 0.6);
    } catch {
      return 0.5;
    }
  }

  /**
   * Get human-readable conflict reason
   */
  private getConflictReason(decision1: NodeDecision, decision2: NodeDecision): string {
    if (decision1.decisionType !== decision2.decisionType) {
      return `Conflicting decision types: ${decision1.decisionType} vs ${decision2.decisionType}`;
    }
    
    return `Incompatible configurations in ${decision1.decisionType}`;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    graph: DecisionGraph,
    conflictLevel: number,
    coherenceScore: number,
    criticalNodes: string[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (conflictLevel > 0.5) {
      recommendations.push(
        `High conflict level detected (${(conflictLevel * 100).toFixed(1)}%). Manual review recommended before execution.`
      );
    } else if (conflictLevel > 0.3) {
      recommendations.push(
        `Moderate conflicts detected. Consider resolving ${graph.conflictCount} conflicting decisions.`
      );
    }
    
    if (coherenceScore > 0.8) {
      recommendations.push(
        `High coherence score (${(coherenceScore * 100).toFixed(1)}%). Decisions are well-aligned for execution.`
      );
    } else if (coherenceScore < 0.5) {
      recommendations.push(
        `Low coherence score (${(coherenceScore * 100).toFixed(1)}%). Nodes may not be working toward common goals.`
      );
    }
    
    if (criticalNodes.length > 0) {
      recommendations.push(
        `${criticalNodes.length} critical nodes identified. Prioritize execution from: ${criticalNodes.slice(0, 3).join(', ')}.`
      );
    }
    
    if (graph.interconnections === 0) {
      recommendations.push(
        `No interconnections detected. Decisions are independent and can be executed in parallel.`
      );
    }
    
    return recommendations;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...config };
    console.log('[DecisionGraphEngine] Configuration updated:', this.config);
  }
}

// Export singleton instance
export const decisionGraphEngine = new DecisionGraphEngine();

console.log('[DecisionGraphEngine] Module loaded');

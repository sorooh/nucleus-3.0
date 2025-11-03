/**
 * TOOL USE SYSTEM - نظام استخدام الأدوات
 * 
 * Function Calling & Tool Execution Engine
 * AI decides which tools to use and how to use them
 * 
 * Features:
 * - Dynamic tool selection and parameter extraction
 * - Safe tool execution with validation
 * - Tool chaining and composition
 * - Result synthesis and error handling
 */

import { aiProviders } from './ai-providers';

// ============================================
// Types & Interfaces
// ============================================

interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: any;
}

interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute: (params: any) => Promise<any>;
  category: 'data' | 'communication' | 'analysis' | 'system' | 'integration';
}

interface ToolCall {
  tool: string;
  parameters: Record<string, any>;
  reasoning: string;
}

interface ToolExecutionResult {
  tool: string;
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
}

interface ToolUseDecision {
  shouldUseTool: boolean;
  toolCalls: ToolCall[];
  reasoning: string;
  confidence: number;
}

// ============================================
// Tool Use System Class
// ============================================

export class ToolUseSystem {
  private tools: Map<string, Tool> = new Map();
  private active: boolean = false;
  private model: string = 'llama'; // 🔓 Llama 3.3 70B - Open-Source tool use

  constructor() {
    this.registerBuiltInTools();
  }


  /**
   * Register built-in tools
   */
  private registerBuiltInTools(): void {
    // Tool 1: Search Memory
    this.registerTool({
      name: 'searchMemory',
      description: 'Search through Memory Hub for insights, patterns, and historical data',
      category: 'data',
      parameters: [
        { name: 'query', type: 'string', description: 'Search query', required: true },
        { name: 'limit', type: 'number', description: 'Max results', required: false, default: 10 },
        { name: 'type', type: 'string', description: 'Memory type filter', required: false }
      ],
      execute: async (params) => {
        try {
          const { memoryHub } = await import('../../nucleus/core/memory-hub');
          const memories = memoryHub.getAllInsights();
          
          // Simple search
          const query = params.query.toLowerCase();
          const filtered = memories.filter((m: any) => 
            m.description.toLowerCase().includes(query) ||
            (m.context && JSON.stringify(m.context).toLowerCase().includes(query))
          );

          return filtered.slice(0, params.limit || 10);
        } catch (error: any) {
          throw new Error(`Memory search failed: ${error.message}`);
        }
      }
    });

    // Tool 2: Get Current Time
    this.registerTool({
      name: 'getCurrentTime',
      description: 'Get current date and time',
      category: 'system',
      parameters: [
        { name: 'timezone', type: 'string', description: 'Timezone (e.g., UTC, Asia/Riyadh)', required: false, default: 'UTC' }
      ],
      execute: async (params) => {
        const now = new Date();
        return {
          timestamp: now.toISOString(),
          timezone: params.timezone || 'UTC',
          readable: now.toLocaleString('ar-SA', { timeZone: params.timezone || 'UTC' })
        };
      }
    });

    // Tool 3: Calculate
    this.registerTool({
      name: 'calculate',
      description: 'Perform mathematical calculations',
      category: 'analysis',
      parameters: [
        { name: 'expression', type: 'string', description: 'Math expression (e.g., "2 + 2", "sqrt(16)")', required: true }
      ],
      execute: async (params) => {
        try {
          // Safe eval alternative (limited to math operations)
          const sanitized = params.expression.replace(/[^0-9+\-*/().\s]/g, '');
          const result = Function(`'use strict'; return (${sanitized})`)();
          return {
            expression: params.expression,
            result: result,
            type: typeof result
          };
        } catch (error: any) {
          throw new Error(`Calculation failed: ${error.message}`);
        }
      }
    });

    // Tool 4: Get System Status
    this.registerTool({
      name: 'getSystemStatus',
      description: 'Get current status of Nucleus systems',
      category: 'system',
      parameters: [],
      execute: async () => {
        try {
          const { nucleus } = await import('../../nucleus/core/nucleus');
          const { memoryHub } = await import('../../nucleus/core/memory-hub');
          const { knowledgeBus } = await import('../../nucleus/integration/knowledge-bus');
          
          return {
            nucleus: nucleus.getStatus(),
            memoryHub: memoryHub.getAnalytics(),
            platforms: knowledgeBus.getPlatforms().length,
            timestamp: new Date().toISOString()
          };
        } catch (error: any) {
          throw new Error(`Status check failed: ${error.message}`);
        }
      }
    });

    // Tool 5: Store Insight
    this.registerTool({
      name: 'storeInsight',
      description: 'Store a new insight in Memory Hub',
      category: 'data',
      parameters: [
        { name: 'description', type: 'string', description: 'Insight description', required: true },
        { name: 'type', type: 'string', description: 'Insight type', required: false, default: 'pattern' },
        { name: 'confidence', type: 'number', description: 'Confidence level (0-1)', required: false, default: 0.8 }
      ],
      execute: async (params) => {
        try {
          const { memoryHub } = await import('../../nucleus/core/memory-hub');
          
          const insight = memoryHub.recordInsight({
            type: params.type || 'pattern',
            description: params.description,
            confidence: params.confidence || 0.8,
            sources: ['tool-use-system'],
            evidence: { 
              createdBy: 'AI',
              timestamp: new Date().toISOString()
            }
          });

          return { success: true, insightId: insight.id };
        } catch (error: any) {
          throw new Error(`Failed to store insight: ${error.message}`);
        }
      }
    });
  }

  /**
   * Activate Tool Use System
   */
  activate(): void {
    if (this.active) {
      console.log('[ToolUse] Already active');
      return;
    }

    this.active = true;
    console.log('🛠️ [ToolUse] Tool execution system activated');
    console.log(`   • Available Tools: ${this.tools.size}`);
    console.log(`   • Model: ${this.model}`);
    this.listTools();
  }

  /**
   * Deactivate Tool Use System
   */
  deactivate(): void {
    this.active = false;
    console.log('[ToolUse] Deactivated');
  }

  /**
   * Register a new tool
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
    console.log(`[ToolUse] ✅ Registered tool: ${tool.name}`);
  }

  /**
   * List all available tools
   */
  private listTools(): void {
    console.log('\n📋 Available Tools:');
    this.tools.forEach(tool => {
      console.log(`   • ${tool.name}: ${tool.description}`);
    });
    console.log('');
  }

  /**
   * Decide if tools should be used for a given request
   */
  async decideToolUse(request: string, context?: any): Promise<ToolUseDecision> {
    if (!this.active) {
      throw new Error('Tool Use System is not active');
    }

    console.log('\n🛠️ [ToolUse] Analyzing request for tool usage');

    // Get available tools description
    const toolsDesc = Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters.map(p => `${p.name} (${p.type})${p.required ? ' *required' : ''}`)
    }));

    const systemPrompt = `أنت نظام ذكي لاختيار الأدوات. حدد إذا كانت الأدوات مطلوبة وأي أدوات يجب استخدامها.

الأدوات المتاحة:
${JSON.stringify(toolsDesc, null, 2)}

أجب بصيغة JSON:
{
  "shouldUseTool": true/false,
  "toolCalls": [
    {
      "tool": "اسم الأداة",
      "parameters": {"param": "value"},
      "reasoning": "لماذا هذه الأداة"
    }
  ],
  "reasoning": "سبب القرار",
  "confidence": 0.85
}`;

    try {
      // Use aiProviders for open-source model access
      const result = await aiProviders.generate(this.model, request, {
        system_prompt: systemPrompt,
        temperature: 0.3,
        max_tokens: 800
      });

      const response = result.content;

      // Parse response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          shouldUseTool: false,
          toolCalls: [],
          reasoning: 'No tools needed',
          confidence: 0.5
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      console.log(`   Decision: ${parsed.shouldUseTool ? 'USE TOOLS' : 'NO TOOLS'} (confidence: ${Math.round(parsed.confidence * 100)}%)`);
      if (parsed.shouldUseTool && parsed.toolCalls) {
        parsed.toolCalls.forEach((call: ToolCall) => {
          console.log(`   → ${call.tool}(${JSON.stringify(call.parameters)})`);
        });
      }

      return {
        shouldUseTool: parsed.shouldUseTool || false,
        toolCalls: parsed.toolCalls || [],
        reasoning: parsed.reasoning || 'No reasoning provided',
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5))
      };
    } catch (error: any) {
      console.error('[ToolUse] Decision failed:', error.message);
      return {
        shouldUseTool: false,
        toolCalls: [],
        reasoning: `Error: ${error.message}`,
        confidence: 0
      };
    }
  }

  /**
   * Execute tool calls
   */
  async executeTools(toolCalls: ToolCall[]): Promise<ToolExecutionResult[]> {
    console.log(`\n🔧 [ToolUse] Executing ${toolCalls.length} tool(s)`);

    const results: ToolExecutionResult[] = [];

    for (const call of toolCalls) {
      const startTime = Date.now();
      
      try {
        const tool = this.tools.get(call.tool);
        
        if (!tool) {
          results.push({
            tool: call.tool,
            success: false,
            error: `Tool '${call.tool}' not found`,
            executionTime: 0
          });
          continue;
        }

        // Validate parameters
        const validationError = this.validateParameters(tool, call.parameters);
        if (validationError) {
          results.push({
            tool: call.tool,
            success: false,
            error: validationError,
            executionTime: 0
          });
          continue;
        }

        // Execute tool
        const result = await tool.execute(call.parameters);
        const executionTime = Date.now() - startTime;

        results.push({
          tool: call.tool,
          success: true,
          result,
          executionTime
        });

        console.log(`   ✅ ${call.tool} completed in ${executionTime}ms`);
      } catch (error: any) {
        const executionTime = Date.now() - startTime;
        results.push({
          tool: call.tool,
          success: false,
          error: error.message,
          executionTime
        });

        console.log(`   ❌ ${call.tool} failed: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Validate tool parameters
   */
  private validateParameters(tool: Tool, params: Record<string, any>): string | null {
    for (const param of tool.parameters) {
      if (param.required && !(param.name in params)) {
        return `Missing required parameter: ${param.name}`;
      }

      if (param.name in params) {
        const value = params[param.name];
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        
        if (param.type !== actualType && actualType !== 'undefined') {
          return `Parameter '${param.name}' should be ${param.type}, got ${actualType}`;
        }
      }
    }

    return null;
  }

  /**
   * Get available tools
   */
  getAvailableTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      active: this.active,
      toolCount: this.tools.size,
      model: this.model,
      tools: Array.from(this.tools.values()).map(t => ({
        name: t.name,
        description: t.description,
        category: t.category
      }))
    };
  }
}

// ============================================
// Export singleton instance
// ============================================

export const toolUseSystem = new ToolUseSystem();

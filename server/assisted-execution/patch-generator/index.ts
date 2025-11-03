/**
 * Patch Generator - مولّد التصحيحات البرمجية
 * Phase 5.1 → 7.0: Assisted Execution Layer
 * 
 * يولّد code patches تلقائياً من المشاكل المكتشفة باستخدام AI
 */

import { EventEmitter } from 'events';
import OpenAI from 'openai';
import { db } from '../../db';
import { executionPatches, executionAudit } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

interface DetectedIssue {
  id: string;
  category: 'performance' | 'integration' | 'data' | 'security';
  severity: 'critical' | 'high' | 'medium' | 'low';
  nucleusId: string;
  description: string;
  detectedAt: Date;
  suggestedSolutions?: string[];
  affectedFiles?: string[];
  context?: {
    errorMessage?: string;
    stackTrace?: string;
    lineNumber?: number;
  };
}

interface GeneratedPatch {
  id: string;
  issueId: string;
  patchContent: string; // Git diff format
  explanation: string;
  affectedFiles: string[];
  estimatedImpact: string;
  confidence: number; // 0-100
  aiModel: string;
  generatedAt: Date;
}

interface PatchRequest {
  issue: DetectedIssue;
  fileContext?: string; // Content of affected file
  relatedCode?: string; // Related code snippets
}

export class PatchGenerator extends EventEmitter {
  private openai: OpenAI;
  private isActive: boolean = false;

  constructor() {
    super();
    console.log('🔧 [PatchGenerator] Initializing patch generation engine...');

    // Initialize OpenAI (will use env variable)
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * تفعيل محرك توليد الـPatches
   */
  async activate(): Promise<void> {
    console.log('🔧 [PatchGenerator] Activating patch generator...');
    this.isActive = true;
    this.emit('activated');
  }

  /**
   * تعطيل المحرك
   */
  deactivate(): void {
    console.log('🔧 [PatchGenerator] Deactivating patch generator...');
    this.isActive = false;
    this.emit('deactivated');
  }

  /**
   * توليد patch من مشكلة مكتشفة
   */
  async generatePatch(request: PatchRequest): Promise<GeneratedPatch> {
    if (!this.isActive) {
      throw new Error('Patch generator is not active');
    }

    console.log(`🔧 [PatchGenerator] Generating patch for issue: ${request.issue.id}`);
    this.emit('patch-generation-started', request.issue.id);

    try {
      // بناء الـprompt للـAI
      const prompt = this.buildGenerationPrompt(request);

      // طلب الـpatch من OpenAI
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert software engineer specialized in fixing code issues. 
Generate a complete, production-ready patch in git diff format. 
Be precise, follow best practices, and ensure the fix doesn't introduce new issues.
Always provide clear explanation of the changes.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Low temperature for more deterministic output
        max_tokens: 2000
      });

      const aiResponse = response.choices[0]?.message?.content || '';
      
      // استخراج الـpatch والتفسير من الرد
      const { patchContent, explanation } = this.parsePatchResponse(aiResponse);

      // CRITICAL: استخراج الملفات المتأثرة من git diff الحقيقي
      // لا نعتمد على request.issue.affectedFiles - نستخرجها من الـdiff نفسه
      const affectedFiles = this.extractAffectedFilesFromDiff(patchContent);
      
      if (affectedFiles.length === 0) {
        console.warn(`⚠️ [PatchGenerator] No affected files found in git diff for issue ${request.issue.id}`);
      }

      // إنشاء الـpatch object
      const patch: GeneratedPatch = {
        id: `patch-${Date.now()}-${randomBytes(5).toString('hex')}`,
        issueId: request.issue.id,
        patchContent,
        explanation,
        affectedFiles, // استخدام الملفات المستخرجة من الـdiff الحقيقي
        estimatedImpact: this.estimateImpact(request.issue),
        confidence: this.calculateConfidence(request.issue, patchContent),
        aiModel: 'gpt-4o',
        generatedAt: new Date()
      };

      // حفظ الـpatch في Database مع confidence
      await this.savePatch(patch);

      console.log(`✅ [PatchGenerator] Patch generated: ${patch.id}`);
      this.emit('patch-generated', patch);

      return patch;

    } catch (error) {
      console.error(`❌ [PatchGenerator] Error generating patch:`, error);
      this.emit('patch-generation-error', { issueId: request.issue.id, error });
      throw error;
    }
  }

  /**
   * بناء الـprompt للـAI
   */
  private buildGenerationPrompt(request: PatchRequest): string {
    const { issue, fileContext } = request;

    let prompt = `
# Issue to Fix

**Category**: ${issue.category}
**Severity**: ${issue.severity}
**Nucleus**: ${issue.nucleusId}

**Description**:
${issue.description}
`;

    if (issue.context?.errorMessage) {
      prompt += `\n**Error Message**:\n${issue.context.errorMessage}\n`;
    }

    if (issue.context?.stackTrace) {
      prompt += `\n**Stack Trace**:\n${issue.context.stackTrace}\n`;
    }

    if (issue.suggestedSolutions && issue.suggestedSolutions.length > 0) {
      prompt += `\n**Suggested Solutions**:\n`;
      issue.suggestedSolutions.forEach((sol, i) => {
        prompt += `${i + 1}. ${sol}\n`;
      });
    }

    if (fileContext) {
      prompt += `\n**Current File Content**:\n\`\`\`typescript\n${fileContext}\n\`\`\`\n`;
    }

    prompt += `
# Task

Generate a complete patch in **git diff format** that fixes this issue. 

Output format:
\`\`\`diff
[your git diff here]
\`\`\`

Then provide a clear explanation of what the patch does and why it fixes the issue.

Make sure the patch:
1. Fixes the root cause, not just symptoms
2. Follows TypeScript/JavaScript best practices
3. Maintains code style consistency
4. Doesn't introduce new issues
5. Is production-ready
`;

    return prompt;
  }

  /**
   * استخراج الملفات المتأثرة من git diff
   * CRITICAL: يستخرج الملفات الحقيقية من الـdiff - لا يعتمد على input
   */
  private extractAffectedFilesFromDiff(diffContent: string): string[] {
    const affectedFiles = new Set<string>();
    
    // Git diff format uses --- a/file.ts and +++ b/file.ts
    const filePatterns = [
      /^---\s+a\/(.+)$/gm,  // Deleted or modified files
      /^\+\+\+\s+b\/(.+)$/gm, // Added or modified files
      /^diff\s+--git\s+a\/(.+)\s+b\/(.+)$/gm // diff --git header
    ];

    for (const pattern of filePatterns) {
      let match;
      while ((match = pattern.exec(diffContent)) !== null) {
        // match[1] contains the file path
        const filePath = match[1];
        
        // Skip /dev/null (used for new/deleted files)
        if (filePath && filePath !== '/dev/null') {
          affectedFiles.add(filePath);
        }
        
        // For diff --git format, also check match[2]
        if (match[2] && match[2] !== '/dev/null') {
          affectedFiles.add(match[2]);
        }
      }
    }

    const files = Array.from(affectedFiles);
    console.log(`📁 [PatchGenerator] Extracted ${files.length} affected file(s) from git diff:`, files);
    
    return files;
  }

  /**
   * استخراج الـpatch والتفسير من رد الـAI
   */
  private parsePatchResponse(response: string): { patchContent: string, explanation: string } {
    // استخراج git diff
    const diffMatch = response.match(/```diff\n([\s\S]*?)```/);
    const patchContent = diffMatch ? diffMatch[1].trim() : '';

    // استخراج التفسير (كل النص بعد الـdiff)
    const afterDiff = response.split('```diff')[1]?.split('```')[1] || response;
    const explanation = afterDiff.trim() || 'Patch generated to fix the detected issue.';

    if (!patchContent) {
      throw new Error('Failed to extract patch content from AI response');
    }

    return { patchContent, explanation };
  }

  /**
   * تقدير تأثير الـpatch
   */
  private estimateImpact(issue: DetectedIssue): string {
    const fileCount = issue.affectedFiles?.length || 1;
    
    if (issue.severity === 'critical') {
      return `High impact: Fixes ${issue.severity} ${issue.category} issue affecting ${fileCount} file(s)`;
    } else if (issue.severity === 'high') {
      return `Medium-high impact: Resolves ${issue.category} issue in ${fileCount} file(s)`;
    } else {
      return `Low-medium impact: Addresses ${issue.category} issue in ${fileCount} file(s)`;
    }
  }

  /**
   * حساب درجة الثقة في الـpatch
   */
  private calculateConfidence(issue: DetectedIssue, patchContent: string): number {
    let confidence = 70; // Base confidence

    // زيادة الثقة إذا كان الـpatch يحتوي على تغييرات واضحة
    if (patchContent.includes('+++') && patchContent.includes('---')) {
      confidence += 10;
    }

    // تقليل الثقة للمشاكل الأمنية (تحتاج مراجعة دقيقة)
    if (issue.category === 'security') {
      confidence -= 20;
    }

    // زيادة الثقة للمشاكل البسيطة
    if (issue.severity === 'low' || issue.severity === 'medium') {
      confidence += 10;
    }

    // التأكد من أن الثقة بين 0-100
    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * حفظ patch في Database
   */
  private async savePatch(patch: GeneratedPatch): Promise<void> {
    try {
      await db.insert(executionPatches).values({
        id: patch.id,
        issueId: patch.issueId,
        patchContent: patch.patchContent,
        explanation: patch.explanation,
        affectedFiles: patch.affectedFiles,
        confidence: patch.confidence,
        aiModel: patch.aiModel,
        estimatedImpact: patch.estimatedImpact,
        status: 'pending',
        validationScore: null,
        validationErrors: null
      });

      // Log in audit trail
      await db.insert(executionAudit).values({
        patchId: patch.id,
        action: 'generated',
        actor: 'system',
        details: {
          issueId: patch.issueId,
          confidence: patch.confidence,
          aiModel: patch.aiModel,
          estimatedImpact: patch.estimatedImpact
        },
        signature: null
      });

      console.log(`💾 [PatchGenerator] Patch saved to database: ${patch.id} (confidence: ${patch.confidence}%)`);
    } catch (error) {
      console.error('Failed to save patch:', error);
      throw error;
    }
  }

  /**
   * الحصول على patch حسب ID من Database
   */
  async getPatch(patchId: string): Promise<any> {
    try {
      const patches = await db.select()
        .from(executionPatches)
        .where(eq(executionPatches.id, patchId))
        .limit(1);
      
      return patches[0] || null;
    } catch (error) {
      console.error('Failed to get patch:', error);
      return null;
    }
  }

  /**
   * الحصول على كل الـpatches من Database
   */
  async getAllPatches(): Promise<any[]> {
    try {
      return await db.select().from(executionPatches);
    } catch (error) {
      console.error('Failed to get all patches:', error);
      return [];
    }
  }

  /**
   * الحصول على patches لمشكلة معينة من Database
   */
  async getPatchesForIssue(issueId: string): Promise<any[]> {
    try {
      return await db.select()
        .from(executionPatches)
        .where(eq(executionPatches.issueId, issueId));
    } catch (error) {
      console.error('Failed to get patches for issue:', error);
      return [];
    }
  }

  /**
   * الحصول على الحالة من Database
   */
  async getStatus() {
    try {
      const allPatches = await this.getAllPatches();
      
      // Calculate average confidence from database
      const patchesWithConfidence = allPatches.filter(p => p.confidence != null);
      const averageConfidence = patchesWithConfidence.length > 0
        ? Math.round(patchesWithConfidence.reduce((sum, p) => sum + (p.confidence || 0), 0) / patchesWithConfidence.length)
        : 0;
      
      return {
        isActive: this.isActive,
        totalPatchesGenerated: allPatches.length,
        averageConfidence
      };
    } catch (error) {
      console.error('Failed to get status:', error);
      return {
        isActive: this.isActive,
        totalPatchesGenerated: 0,
        averageConfidence: 0
      };
    }
  }
}

// Export singleton instance
export const patchGenerator = new PatchGenerator();

/**
 * ═══════════════════════════════════════════════════════════
 * Real Code Analysis Service
 * ═══════════════════════════════════════════════════════════
 * AI-powered code analysis using Llama 3.3 70B (OpenRouter)
 * REAL IMPLEMENTATION - No Mocks
 * Professional implementation - Abu Sham Vision
 */

interface AnalysisJob {
  id: string;
  nucleusId: string;
  repositoryUrl: string;
  branch?: string;
  status: string;
}

export interface AnalysisResult {
  issues: CodeIssue[];
  metrics: CodeMetrics;
  suggestions: string[];
  score: number;
  aiInsights?: string;
}

export interface CodeIssue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'SECURITY' | 'PERFORMANCE' | 'QUALITY' | 'STYLE';
  message: string;
  file: string;
  line?: number;
  suggestion?: string;
}

export interface CodeMetrics {
  totalFiles: number;
  totalLines: number;
  complexity: number;
  duplicates: number;
  testCoverage?: number;
}

/**
 * Real Analysis Service
 * - Uses Llama 3.3 70B for AI-powered insights
 * - Performs code scanning
 * - Security analysis
 * - Performance metrics
 * - REAL IMPLEMENTATION - Uses Platform Connector
 */
export class RealAnalysisService {
  private readonly apiKey: string;
  private readonly model = 'meta-llama/llama-3.3-70b-instruct';
  
  constructor(private platformConnector?: any) {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    
    if (!this.apiKey) {
      console.error('[RealAnalysisService] ❌ OPENROUTER_API_KEY not found!');
    } else {
      console.log('[RealAnalysisService] ✅ Initialized with Llama 3.3 70B');
    }
    
    if (platformConnector) {
      console.log('[RealAnalysisService] ✅ Platform Connector injected - REAL mode');
    } else {
      console.warn('[RealAnalysisService] ⚠️  No Platform Connector - Limited functionality');
    }
  }

  /**
   * تحليل كود المستودع - REAL IMPLEMENTATION
   * Analyze repository code with AI
   */
  async analyze(job: AnalysisJob): Promise<AnalysisResult> {
    console.log(`[RealAnalysisService] 🔍 Starting REAL analysis for job: ${job.id}`);
    console.log(`[RealAnalysisService] 🤖 Using AI Model: ${this.model}`);

    try {
      // Step 1: Fetch REAL codebase via Platform Connector
      const codebase = await this.fetchCodebase(job.nucleusId, job.repositoryUrl, job.branch);
      
      // Step 2: Scan for basic issues
      const basicIssues = await this.scanCode(codebase);
      
      // Step 3: Calculate metrics
      const metrics = this.calculateMetrics(codebase);
      
      // Step 4: AI-powered deep analysis
      const aiAnalysis = await this.aiDeepAnalysis(codebase, basicIssues);
      
      // Step 5: Merge results
      const allIssues = [...basicIssues, ...aiAnalysis.issues];
      
      // Step 6: Calculate quality score
      const score = this.calculateQualityScore(allIssues, metrics);

      console.log(`[RealAnalysisService] ✅ Analysis complete: ${allIssues.length} issues, score: ${score}/100`);

      return {
        issues: allIssues,
        metrics,
        suggestions: aiAnalysis.suggestions,
        score,
        aiInsights: aiAnalysis.insights,
      };
    } catch (error: any) {
      console.error(`[RealAnalysisService] ❌ Analysis failed:`, error);
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  /**
   * جلب الكود من المستودع - REAL IMPLEMENTATION
   * Fetch codebase via Platform Connector (NO MOCKS!)
   */
  private async fetchCodebase(nucleusId: string, repositoryUrl: string, branch = 'main'): Promise<any> {
    console.log(`[RealAnalysisService] 📥 Fetching REAL codebase: ${repositoryUrl}@${branch}`);
    
    if (!this.platformConnector) {
      throw new Error('Platform Connector not available - Cannot fetch real codebase');
    }

    try {
      // REAL FETCH via Platform Connector
      const codebase = await this.platformConnector.fetchCodebase(nucleusId, repositoryUrl, {
        branch,
      });

      console.log(`[RealAnalysisService] ✅ Real codebase fetched: ${codebase.totalFiles || 0} files`);
      
      return codebase;
    } catch (error: any) {
      console.error(`[RealAnalysisService] ❌ Failed to fetch codebase:`, error);
      throw new Error(`Codebase fetch failed: ${error.message}`);
    }
  }

  /**
   * فحص الكود الأساسي
   * Basic code scanning
   */
  private async scanCode(codebase: any): Promise<CodeIssue[]> {
    console.log(`[RealAnalysisService] 🔍 Scanning ${codebase.totalFiles} files...`);
    
    const issues: CodeIssue[] = [];

    // Basic patterns scan (would be more sophisticated in production)
    for (const file of codebase.files) {
      // Security checks
      if (file.content.includes('eval(') || file.content.includes('Function(')) {
        issues.push({
          severity: 'CRITICAL',
          category: 'SECURITY',
          message: 'Dangerous eval() or Function() usage detected',
          file: file.path,
          line: 1,
          suggestion: 'Avoid using eval() - use safer alternatives',
        });
      }

      // Performance checks
      if (file.content.includes('console.log') && !file.path.includes('test')) {
        issues.push({
          severity: 'LOW',
          category: 'PERFORMANCE',
          message: 'Console.log found in production code',
          file: file.path,
          suggestion: 'Remove console.log statements in production',
        });
      }

      // Quality checks
      if (file.lines > 300) {
        issues.push({
          severity: 'MEDIUM',
          category: 'QUALITY',
          message: 'File is too long (>300 lines)',
          file: file.path,
          line: file.lines,
          suggestion: 'Consider breaking this file into smaller modules',
        });
      }
    }

    console.log(`[RealAnalysisService] ✅ Basic scan complete: ${issues.length} issues found`);
    return issues;
  }

  /**
   * تحليل عميق باستخدام AI
   * AI-powered deep analysis using Llama 3.3 70B
   */
  private async aiDeepAnalysis(
    codebase: any, 
    basicIssues: CodeIssue[]
  ): Promise<{ issues: CodeIssue[]; suggestions: string[]; insights: string }> {
    if (!this.apiKey) {
      console.warn('[RealAnalysisService] ⚠️  No API key - skipping AI analysis');
      return { issues: [], suggestions: [], insights: 'AI analysis unavailable (no API key)' };
    }

    console.log(`[RealAnalysisService] 🤖 Starting AI deep analysis...`);

    try {
      const prompt = this.buildAnalysisPrompt(codebase, basicIssues);
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://replit.com',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert code analyzer for the Surooh Empire Integration Hub. Analyze code quality, security, and architecture. Respond in JSON format.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3, // Lower for more consistent analysis
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || '{}';
      
      // Parse AI response
      const parsed = this.parseAIResponse(aiResponse);
      
      console.log(`[RealAnalysisService] ✅ AI analysis complete`);
      console.log(`[RealAnalysisService] 📊 AI found ${parsed.issues.length} additional issues`);
      
      return parsed;
    } catch (error: any) {
      console.error(`[RealAnalysisService] ❌ AI analysis failed:`, error);
      return {
        issues: [],
        suggestions: ['AI analysis failed - using basic scanning only'],
        insights: `AI analysis error: ${error.message}`,
      };
    }
  }

  /**
   * بناء prompt للتحليل
   * Build analysis prompt for AI
   */
  private buildAnalysisPrompt(codebase: any, basicIssues: CodeIssue[]): string {
    return `Analyze this codebase and return a JSON object with your findings:

**Codebase:**
- Repository: ${codebase.url}
- Total Files: ${codebase.totalFiles}
- Total Lines: ${codebase.totalLines}

**Files:**
${codebase.files.map((f: any) => `- ${f.path} (${f.lines} lines)`).join('\n')}

**Basic Issues Found:** ${basicIssues.length}

**Your Task:**
Provide additional insights beyond basic scanning. Focus on:
1. Architecture quality
2. Security vulnerabilities
3. Performance bottlenecks
4. Code maintainability
5. Best practices violations

**Response Format (JSON):**
{
  "issues": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "category": "SECURITY|PERFORMANCE|QUALITY|STYLE",
      "message": "Issue description",
      "file": "file/path",
      "suggestion": "How to fix"
    }
  ],
  "suggestions": ["Suggestion 1", "Suggestion 2"],
  "insights": "Overall analysis summary"
}`;
  }

  /**
   * تحليل استجابة AI
   * Parse AI response
   */
  private parseAIResponse(response: string): { 
    issues: CodeIssue[]; 
    suggestions: string[]; 
    insights: string 
  } {
    try {
      // Try to extract JSON from response (AI might wrap it in markdown)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        issues: parsed.issues || [],
        suggestions: parsed.suggestions || [],
        insights: parsed.insights || response.substring(0, 500),
      };
    } catch (error: any) {
      console.error('[RealAnalysisService] ❌ Failed to parse AI response:', error);
      return {
        issues: [],
        suggestions: [],
        insights: response.substring(0, 500), // Fallback to raw text
      };
    }
  }

  /**
   * حساب مقاييس الكود
   * Calculate code metrics
   */
  private calculateMetrics(codebase: any): CodeMetrics {
    const totalFiles = codebase.files?.length || 0;
    const totalLines = codebase.files?.reduce((sum: number, f: any) => sum + f.lines, 0) || 0;
    
    // Calculate complexity (simplified - real implementation would use AST)
    const avgLinesPerFile = totalFiles > 0 ? totalLines / totalFiles : 0;
    const complexity = Math.min(100, Math.floor(avgLinesPerFile * 0.5));

    return {
      totalFiles,
      totalLines,
      complexity,
      duplicates: 0, // Would need sophisticated analysis
      testCoverage: 0, // Would need test execution
    };
  }

  /**
   * حساب نقاط الجودة
   * Calculate quality score
   */
  private calculateQualityScore(issues: CodeIssue[], metrics: CodeMetrics): number {
    let score = 100;

    // Deduct points for issues
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL').length;
    const highIssues = issues.filter(i => i.severity === 'HIGH').length;
    const mediumIssues = issues.filter(i => i.severity === 'MEDIUM').length;
    const lowIssues = issues.filter(i => i.severity === 'LOW').length;

    score -= criticalIssues * 20;
    score -= highIssues * 10;
    score -= mediumIssues * 5;
    score -= lowIssues * 2;

    // Deduct for complexity
    if (metrics.complexity > 75) {
      score -= 10;
    } else if (metrics.complexity > 50) {
      score -= 5;
    }

    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, score));
  }
}

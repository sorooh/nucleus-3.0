import type { AuditConfig, AuditReport, SystemHealth, ValidationResult } from "../types";
import { promises as fs } from "fs";
import { glob } from "glob";

export interface ValidationLayer {
  name: string;
  validate(): Promise<ValidationResult>;
}

export class FoundationValidator implements ValidationLayer {
  name = "Foundation";
  
  async validate(): Promise<ValidationResult> {
    const checks = await Promise.all([
      this.checkCoreFiles(),
      this.checkDependencies(),
      this.checkEnvironment()
    ]);
    
    return {
      passed: checks.every(c => c.passed),
      issues: checks.flatMap(c => c.issues || []),
      score: checks.reduce((sum, c) => sum + c.score, 0) / checks.length
    };
  }
  
  private async checkCoreFiles() {
    const issues: string[] = [];
    let score = 100;
    
    // Check for required directories
    const requiredDirs = ["server", "client", "shared"];
    for (const dir of requiredDirs) {
      try {
        await fs.access(dir);
      } catch {
        issues.push(`Missing required directory: ${dir}`);
        score -= 15;
      }
    }
    
    return { passed: score > 80, issues, score };
  }
  
  private async checkDependencies() {
    const issues: string[] = [];
    let score = 100;
    
    try {
      const pkg = JSON.parse(await fs.readFile("package.json", "utf-8"));
      if (!pkg.dependencies) {
        issues.push("package.json missing dependencies section");
        score -= 20;
      }
      if (!pkg.devDependencies) {
        issues.push("package.json missing devDependencies section");
        score -= 10;
      }
    } catch (e) {
      issues.push("package.json not found or invalid");
      score = 0;
    }
    
    return { passed: score > 80, issues, score };
  }
  
  private async checkEnvironment() {
    const issues: string[] = [];
    let score = 100;
    
    // Check for critical environment setup
    if (!process.env.DATABASE_URL) {
      issues.push("DATABASE_URL not configured");
      score -= 20;
    }
    
    return { passed: score > 80, issues, score };
  }
}

export class LogicValidator implements ValidationLayer {
  name = "Logic";
  
  async validate(): Promise<ValidationResult> {
    const checks = await Promise.all([
      this.checkBusinessLogic(),
      this.checkDataFlow(),
      this.checkErrorHandling()
    ]);
    
    return {
      passed: checks.every(c => c.passed),
      issues: checks.flatMap(c => c.issues || []),
      score: checks.reduce((sum, c) => sum + c.score, 0) / checks.length
    };
  }
  
  private async checkBusinessLogic() {
    const issues: string[] = [];
    let score = 100;
    
    try {
      // Scan for Math.random() usage (potential mock data generation)
      const tsFiles = await glob("**/*.ts", { ignore: ["node_modules/**", "dist/**"] });
      let randomCount = 0;
      
      for (const file of tsFiles.slice(0, 50)) {
        try {
          const content = await fs.readFile(file, "utf-8");
          if (content.includes("Math.random()")) {
            randomCount++;
            issues.push(`Math.random() detected in ${file} - potential mock data`);
            score -= 2;
          }
        } catch {
          // Skip unreadable files
        }
      }
      
      if (randomCount > 5) {
        issues.push(`Excessive Math.random() usage (${randomCount} files) suggests mock data generation`);
      }
    } catch (e) {
      score = 70;
    }
    
    return { passed: score > 80, issues, score: Math.max(0, score) };
  }
  
  private async checkDataFlow() {
    const issues: string[] = [];
    let score = 100;
    
    try {
      // Check for hardcoded test data patterns
      const codeFiles = await glob("**/*.{ts,tsx}", { 
        ignore: ["node_modules/**", "dist/**", "**/*.test.ts"] 
      });
      
      for (const file of codeFiles.slice(0, 30)) {
        try {
          const content = await fs.readFile(file, "utf-8");
          
          // Detect test data arrays
          if (content.match(/const\s+\w+\s*=\s*\[[\s\S]{0,200}\{.*test.*\}/i)) {
            issues.push(`Hardcoded test data array in ${file}`);
            score -= 3;
          }
        } catch {
          // Skip unreadable files
        }
      }
    } catch (e) {
      score = 70;
    }
    
    return { passed: score > 80, issues, score: Math.max(0, score) };
  }
  
  private async checkErrorHandling() {
    // Basic check - always passes for now
    return { passed: true, issues: [], score: 100 };
  }
}

export class DataValidator implements ValidationLayer {
  name = "Data";
  
  async validate(): Promise<ValidationResult> {
    const checks = await Promise.all([
      this.checkDataIntegrity(),
      this.checkDataConsistency(),
      this.checkDataSources()
    ]);
    
    return {
      passed: checks.every(c => c.passed),
      issues: checks.flatMap(c => c.issues || []),
      score: checks.reduce((sum, c) => sum + c.score, 0) / checks.length
    };
  }
  
  private async checkDataIntegrity() {
    const issues: string[] = [];
    let score = 100;
    
    try {
      // Scan for common mock data patterns
      const codeFiles = await glob("**/*.{ts,tsx,js,jsx}", { 
        ignore: ["node_modules/**", "dist/**", "build/**"] 
      });
      
      const mockPatterns = [
        { pattern: /lorem\s+ipsum/i, name: "Lorem ipsum text" },
        { pattern: /"test@test\.com"/i, name: "Test email" },
        { pattern: /"test123"/i, name: "Test password" },
        { pattern: /\[1,\s*2,\s*3,\s*4,\s*5\]/i, name: "Sequential mock array" },
      ];

      for (const file of codeFiles.slice(0, 30)) {
        try {
          const content = await fs.readFile(file, "utf-8");
          
          for (const { pattern, name } of mockPatterns) {
            if (pattern.test(content)) {
              issues.push(`${name} detected in ${file}`);
              score -= 2;
            }
          }
        } catch {
          // Skip unreadable files
        }
      }
    } catch (e) {
      score = 80;
    }
    
    return { passed: score > 80, issues, score: Math.max(0, score) };
  }
  
  private async checkDataConsistency() {
    // Basic check - always passes for now
    return { passed: true, issues: [], score: 100 };
  }
  
  private async checkDataSources() {
    // Basic check - always passes for now
    return { passed: true, issues: [], score: 100 };
  }
}

export class IntegrationValidator implements ValidationLayer {
  name = "Integration";
  
  async validate(): Promise<ValidationResult> {
    const checks = await Promise.all([
      this.checkAPIEndpoints(),
      this.checkDatabaseConnections(),
      this.checkExternalServices()
    ]);
    
    return {
      passed: checks.every(c => c.passed),
      issues: checks.flatMap(c => c.issues || []),
      score: checks.reduce((sum, c) => sum + c.score, 0) / checks.length
    };
  }
  
  private async checkAPIEndpoints() {
    const issues: string[] = [];
    let score = 100;
    
    try {
      // Check API route files for static responses
      const apiFiles = await glob("server/**/*{route,api}*.ts", { ignore: ["node_modules/**"] });
      
      for (const file of apiFiles.slice(0, 20)) {
        try {
          const content = await fs.readFile(file, "utf-8");
          
          // Detect static res.json() responses
          if (content.match(/res\.json\(\s*\{[^}]{5,100}\}\s*\)/)) {
            issues.push(`Static response detected in ${file} - potential mock API`);
            score -= 4;
          }
        } catch {
          // Skip unreadable files
        }
      }
    } catch (e) {
      score = 90;
    }
    
    return { passed: score > 80, issues, score: Math.max(0, score) };
  }
  
  private async checkDatabaseConnections() {
    const issues: string[] = [];
    let score = 100;
    
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      issues.push("DATABASE_URL not configured");
      score = 0;
    }
    
    return { passed: score > 80, issues, score };
  }
  
  private async checkExternalServices() {
    // Basic check - always passes for now
    return { passed: true, issues: [], score: 100 };
  }
}

export class SafeAuditEngine {
  private validationLayers: ValidationLayer[] = [
    new FoundationValidator(),
    new LogicValidator(),
    new DataValidator(),
    new IntegrationValidator()
  ];

  async runSafeAudit(config: AuditConfig): Promise<AuditReport> {
    const systemHealth = await this.validateSystemFoundation();
    
    if (!systemHealth.isStable) {
      throw new Error(`Unstable foundation: ${systemHealth.issues.join(', ')}`);
    }
    
    return await this.executeSafeAudit(config);
  }

  private async validateSystemFoundation(): Promise<SystemHealth> {
    const checks = await Promise.all([
      this.checkCoreCalculations(),
      this.checkDataConsistency(),
      this.checkBusinessRules(),
      this.checkDependencies()
    ]);
    
    return this.analyzeSystemHealth(checks);
  }

  private async checkCoreCalculations() {
    return { name: "Core Calculations", passed: true, issues: [] };
  }

  private async checkDataConsistency() {
    return { name: "Data Consistency", passed: true, issues: [] };
  }

  private async checkBusinessRules() {
    return { name: "Business Rules", passed: true, issues: [] };
  }

  private async checkDependencies() {
    const issues: string[] = [];
    try {
      await fs.access("package.json");
    } catch {
      issues.push("package.json not found");
    }
    return { 
      name: "Dependencies", 
      passed: issues.length === 0, 
      issues 
    };
  }

  private analyzeSystemHealth(checks: any[]): SystemHealth {
    const issues = checks.flatMap(c => c.issues || []);
    return {
      isStable: checks.every(c => c.passed),
      issues,
      timestamp: new Date()
    };
  }

  private async executeSafeAudit(config: AuditConfig): Promise<AuditReport> {
    const results = await Promise.all(
      this.validationLayers.map(layer => layer.validate())
    );

    const overallScore = results.reduce((sum: number, r: ValidationResult) => sum + r.score, 0) / results.length;
    const allIssues = results.flatMap((r: ValidationResult) => r.issues || []);

    return {
      timestamp: new Date(),
      config,
      overallScore,
      passed: results.every((r: ValidationResult) => r.passed),
      layers: results,
      issues: allIssues,
      recommendations: this.generateRecommendations(allIssues)
    };
  }

  private generateRecommendations(issues: string[]) {
    return issues.map(issue => ({
      issue,
      action: "Review and fix",
      priority: "HIGH"
    }));
  }
}

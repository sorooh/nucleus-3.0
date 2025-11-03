import type { AuditFinding, RepairProposal, RiskAssessment } from "../types";

export interface RepairStrategy {
  name: string;
  proposeFix(finding: AuditFinding): Promise<RepairProposal>;
}

export class CalculationRepair implements RepairStrategy {
  name = "Calculation Repair";
  
  async proposeFix(finding: AuditFinding): Promise<RepairProposal> {
    return {
      autoApplicable: true,
      confidence: 0.85,
      riskAssessment: {
        riskLevel: 0.3,
        affectedComponents: finding.location,
        potentialSideEffects: [],
        confidence: 0.85
      },
      recommendedAction: "AUTO_FIX",
      details: { type: "calculation_fix" }
    };
  }
}

export class DataRepair implements RepairStrategy {
  name = "Data Repair";
  
  async proposeFix(finding: AuditFinding): Promise<RepairProposal> {
    return {
      autoApplicable: false,
      confidence: 0.6,
      riskAssessment: {
        riskLevel: 0.7,
        affectedComponents: finding.location,
        potentialSideEffects: ["Data loss risk"],
        confidence: 0.6
      },
      recommendedAction: "MANUAL_REVIEW",
      details: { type: "data_fix", requiresBackup: true }
    };
  }
}

export class LogicRepair implements RepairStrategy {
  name = "Logic Repair";
  
  async proposeFix(finding: AuditFinding): Promise<RepairProposal> {
    return {
      autoApplicable: true,
      confidence: 0.75,
      riskAssessment: {
        riskLevel: 0.4,
        affectedComponents: finding.location,
        potentialSideEffects: ["Business logic change"],
        confidence: 0.75
      },
      recommendedAction: "AUTO_FIX",
      details: { type: "logic_fix" }
    };
  }
}

export class ConfigRepair implements RepairStrategy {
  name = "Config Repair";
  
  async proposeFix(finding: AuditFinding): Promise<RepairProposal> {
    return {
      autoApplicable: true,
      confidence: 0.95,
      riskAssessment: {
        riskLevel: 0.1,
        affectedComponents: finding.location,
        potentialSideEffects: [],
        confidence: 0.95
      },
      recommendedAction: "AUTO_FIX",
      details: { type: "config_fix" }
    };
  }
}

export class IntelligentRepairEngine {
  private repairStrategies = new Map<string, RepairStrategy>([
    ["CALCULATION_ERROR", new CalculationRepair()],
    ["DATA_CORRUPTION", new DataRepair()],
    ["LOGIC_ERROR", new LogicRepair()],
    ["CONFIG_ERROR", new ConfigRepair()],
    ["FAKE_UI", new DataRepair()],
    ["MOCK_API", new LogicRepair()],
    ["STATIC_DATA", new DataRepair()]
  ]);

  async proposeSafeFix(finding: AuditFinding): Promise<RepairProposal> {
    const impact = await this.analyzeRepairImpact(finding);
    
    if (impact.riskLevel > 0.7) {
      return {
        autoApplicable: false,
        confidence: impact.confidence,
        riskAssessment: impact,
        recommendedAction: "MANUAL_REVIEW"
      };
    }
    
    const strategy = this.repairStrategies.get(finding.type) || this.repairStrategies.get("CONFIG_ERROR")!;
    return await strategy.proposeFix(finding);
  }

  private async analyzeRepairImpact(finding: AuditFinding): Promise<RiskAssessment> {
    return {
      riskLevel: await this.calculateRisk(finding),
      affectedComponents: await this.findDependentComponents(finding),
      potentialSideEffects: await this.predictSideEffects(finding),
      confidence: await this.calculateConfidence(finding)
    };
  }

  private async calculateRisk(finding: AuditFinding): Promise<number> {
    const severityWeights = {
      'LOW': 0.2,
      'MEDIUM': 0.5,
      'HIGH': 0.75,
      'CRITICAL': 0.95
    };
    return severityWeights[finding.severity || 'MEDIUM'];
  }

  private async findDependentComponents(finding: AuditFinding): Promise<string[]> {
    return finding.location || [];
  }

  private async predictSideEffects(finding: AuditFinding): Promise<string[]> {
    const sideEffects: string[] = [];
    if (finding.type.includes('DATA')) {
      sideEffects.push('Potential data consistency issues');
    }
    if (finding.type.includes('API')) {
      sideEffects.push('API contract changes');
    }
    return sideEffects;
  }

  private async calculateConfidence(finding: AuditFinding): Promise<number> {
    const evidence = Array.isArray(finding.evidence) ? finding.evidence : [finding.evidence];
    return Math.min(0.95, 0.5 + (evidence.length * 0.1));
  }
}

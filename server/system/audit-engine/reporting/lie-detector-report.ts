import type { LieDetectionReport, Finding } from "../types";
import { FakeUIDetector, BackendConnectivityChecker, RealOperationsTester, FakeAPIDetector } from "../detectors/fake-ui-detector";

export class LieDetectorReport {
  async generateLieReport(): Promise<LieDetectionReport> {
    const detectors = [
      new FakeUIDetector(),
      new BackendConnectivityChecker(),
      new RealOperationsTester(),
      new FakeAPIDetector()
    ];

    const findings = await Promise.all(
      detectors.map(d => d.detect())
    );

    return {
      timestamp: new Date(),
      overallVerdict: this.determineVerdict(findings),
      realityScore: this.calculateRealityScore(findings),
      liesDetected: this.countLies(findings),
      detailedFindings: findings,
      confidence: this.calculateConfidence(findings),
      recommendations: this.generateRecommendations(findings)
    };
  }

  private determineVerdict(findings: Finding[]): string {
    const fakeCount = findings.filter(f => f.isFake).length;
    const total = findings.length;
    
    if (fakeCount === 0) return "REAL_SYSTEM";
    if (fakeCount <= total * 0.3) return "MOSTLY_REAL";
    if (fakeCount <= total * 0.6) return "PARTIALLY_FAKE";
    return "FAKE_DEMO";
  }

  private calculateRealityScore(findings: Finding[]): number {
    const realCount = findings.filter(f => !f.isFake).length;
    return findings.length > 0 ? realCount / findings.length : 1.0;
  }

  private countLies(findings: Finding[]): number {
    return findings.filter(f => f.isFake).length;
  }

  private calculateConfidence(findings: Finding[]): number {
    if (findings.length === 0) return 0;
    const totalConfidence = findings.reduce((sum, f) => sum + f.confidence, 0);
    return totalConfidence / findings.length;
  }

  private generateRecommendations(findings: Finding[]): string[] {
    const recommendations: string[] = [];
    
    const fakeFindings = findings.filter(f => f.isFake);
    
    if (fakeFindings.length === 0) {
      recommendations.push("System appears to be operating with real data. Continue monitoring.");
      return recommendations;
    }

    fakeFindings.forEach(finding => {
      if (finding.type === "STATIC_DATA") {
        recommendations.push("Replace static data with dynamic database queries");
      }
      if (finding.type === "MOCK_API") {
        recommendations.push("Connect to real API endpoints instead of mocks");
      }
      if (finding.type === "FAKE_UI") {
        recommendations.push("Implement real UI components with actual data binding");
      }
    });

    return recommendations;
  }
}

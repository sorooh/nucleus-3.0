// WeeklyReporter — auto-generate weekly summaries (problems, fixes, top performers)

type WeekData = {
  problems: Array<{ id: string; nucleus?: string; severity?: string; createdAt: Date; fixed?: boolean }>;
  repairs: Array<{ id: string; programmerId: string; autoFixed?: boolean; createdAt: Date; durationMs?: number }>;
  programmers: Array<{ name: string; trustScore: number; fixedProblems: number; averageFixTime?: number }>;
};

export type WeeklyReport = {
  period: { start: string; end: string };
  summary: {
    totalProblems: number;
    autoFixed: number;
    manualFixed: number;
    avgFixTime: string;
  };
  topProgrammers: Array<{ name: string; trustScore: number; problemsFixed: number; avgFixTime?: string }>;
  repeatedIssues: string[];
  recommendations: string[];
};

export class WeeklyReporter {
  async generateWeeklyReport(): Promise<WeeklyReport> {
    const weekData = await this.gatherWeekData();

    const autoFixed = weekData.repairs.filter(r => r.autoFixed).length;
    const manualFixed = weekData.repairs.filter(r => !r.autoFixed).length;
    const avgFixMs = this.calculateAverageFixTime(weekData.repairs);

    return {
      period: this.getWeekPeriod(),
      summary: {
        totalProblems: weekData.problems.length,
        autoFixed,
        manualFixed,
        avgFixTime: `${Math.round(avgFixMs / 1000)}s`,
      },
      topProgrammers: this.getTopProgrammers(weekData),
      repeatedIssues: this.findRepeatedIssues(weekData),
      recommendations: this.generateRecommendations(weekData),
    };
  }

  // ── Real data collection from repairHistoryService
  private async gatherWeekData(): Promise<WeekData> {
    const { repairHistoryService } = await import('../core/repair-history');
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get all programmers and their stats
    const rankings = await repairHistoryService.getProgrammerRankings();
    const programmers = await Promise.all(
      rankings.map(async (r: any) => {
        const stats = await repairHistoryService.getProgrammerStats(r.programmerId);
        const history = await repairHistoryService.getProgrammerHistory(r.programmerId, 100);
        
        // Calculate REAL average fix time from actual repair records
        const recentRepairs = history.filter((h: any) => new Date(h.timestamp) >= oneWeekAgo);
        const avgTime = recentRepairs.length > 0 
          ? recentRepairs.reduce((sum: number, h: any) => sum + (h.duration || 0), 0) / recentRepairs.length
          : undefined;

        return {
          name: stats.programmerId,
          trustScore: stats.trustScore,
          fixedProblems: stats.successfulRepairs,
          averageFixTime: avgTime,
        };
      })
    );

    // Get recent repair history
    const allHistory = await Promise.all(
      rankings.map((r: any) => repairHistoryService.getProgrammerHistory(r.programmerId, 100))
    );
    const flatHistory = allHistory.flat();

    // Filter to this week's repairs - pass through ALL real fields from history
    const repairs = flatHistory
      .filter((h: any) => new Date(h.timestamp) >= oneWeekAgo)
      .map((h: any) => ({
        id: h.id,
        programmerId: h.programmerId,
        autoFixed: h.action === 'AUTO_FIXED',
        createdAt: new Date(h.timestamp),
        durationMs: h.duration || undefined,
        nucleus: h.nucleus, // Pass through from history record
        severity: h.severity, // Pass through from history record
      }));

    // Convert repairs to problems - ONLY use real data, skip if missing
    const problems = repairs
      .filter((r: any) => r.nucleus && r.severity) // Skip records with missing required fields
      .map((r: any) => ({
        id: r.id,
        nucleus: r.nucleus, // Real value from history
        severity: r.severity, // Real value from history
        createdAt: r.createdAt,
        fixed: r.autoFixed,
      }));

    return {
      problems,
      repairs,
      programmers,
    };
  }

  private calculateAverageFixTime(repairs: WeekData["repairs"]): number {
    const times = repairs.map(r => r.durationMs || 0).filter(Boolean);
    if (!times.length) return 0;
    return times.reduce((a, b) => a + b, 0) / times.length;
    }

  private getTopProgrammers(week: WeekData) {
    return week.programmers
      .map(p => ({
        name: p.name,
        trustScore: p.trustScore,
        problemsFixed: p.fixedProblems,
        avgFixTime: p.averageFixTime ? `${Math.round((p.averageFixTime || 0) / 1000)}s` : undefined,
      }))
      .sort((a, b) => b.trustScore - a.trustScore)
      .slice(0, 5);
  }

  private findRepeatedIssues(week: WeekData): string[] {
    const byNucleus: Record<string, number> = {};
    week.problems.forEach(p => {
      // Only count problems with real nucleus data - no fabricated fallbacks
      if (!p.nucleus) return;
      byNucleus[p.nucleus] = (byNucleus[p.nucleus] ?? 0) + 1;
    });
    return Object.entries(byNucleus)
      .filter(([, n]) => n >= 3)
      .map(([k]) => `High frequency issues on nucleus: ${k}`);
  }

  private generateRecommendations(week: WeekData): string[] {
    const recs: string[] = [];
    if (week.problems.length > 50) recs.push("Increase pre-commit checks across all nuclei.");
    if (week.repairs.filter(r => r.autoFixed).length > week.repairs.length * 0.6) {
      recs.push("Tighten auto-repair thresholds to avoid risky automated patches.");
    }
    if (week.programmers.find(p => p.trustScore < 0.4)) {
      recs.push("Mandate peer reviews for low-trust developers for the next sprint.");
    }
    return recs.length ? recs : ["System is stable. Keep current guardrails."];
  }

  private getWeekPeriod() {
    const now = new Date();
    const end = new Date(now);
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return { start: start.toISOString(), end: end.toISOString() };
  }
}

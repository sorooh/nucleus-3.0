/**
 * AUTO-ENFORCEMENT RULES
 * Block or restrict low-trust programmers automatically
 */

import { repairHistoryService } from "../core/repair-history";

export interface EnforcementRule {
  minTrustScore: number; // Minimum trust score required
  action: "block" | "require_review" | "warning";
  duration: number; // Duration in days
  reason: string;
}

export interface EnforcementDecision {
  programmerId: string;
  allowed: boolean;
  action: string;
  reason: string;
  trustScore: number;
  banExpiresAt?: Date;
}

export class AutoEnforcement {
  // Enforcement rules configuration
  private rules: EnforcementRule[] = [
    {
      minTrustScore: 30,
      action: "block",
      duration: 7,
      reason: "Trust score critically low (< 30). Commits blocked for 7 days.",
    },
    {
      minTrustScore: 50,
      action: "require_review",
      duration: 3,
      reason: "Trust score low (< 50). All commits require manual review for 3 days.",
    },
    {
      minTrustScore: 70,
      action: "warning",
      duration: 0,
      reason: "Trust score moderate (< 70). Warning issued.",
    },
  ];

  /**
   * Enforce quality standards based on programmer trust score
   */
  async enforceQualityStandards(programmerId: string): Promise<EnforcementDecision> {
    // Get programmer stats
    const stats = await repairHistoryService.getProgrammerStats(programmerId);
    const trustScore = stats.trustScore;

    console.log(`[Auto Enforcement] ⚖️ Checking ${programmerId} (trust: ${trustScore})`);

    // Find applicable rule
    const rule = this.findApplicableRule(trustScore);

    if (!rule) {
      // No enforcement needed - trust score is good
      return {
        programmerId,
        allowed: true,
        action: "none",
        reason: "Trust score acceptable",
        trustScore,
      };
    }

    // Apply enforcement action
    switch (rule.action) {
      case "block":
        return {
          programmerId,
          allowed: false,
          action: "block",
          reason: rule.reason,
          trustScore,
          banExpiresAt: this.calculateBanExpiry(rule.duration),
        };

      case "require_review":
        return {
          programmerId,
          allowed: true, // Can commit but requires review
          action: "require_review",
          reason: rule.reason,
          trustScore,
          banExpiresAt: this.calculateBanExpiry(rule.duration),
        };

      case "warning":
        return {
          programmerId,
          allowed: true,
          action: "warning",
          reason: rule.reason,
          trustScore,
        };

      default:
        return {
          programmerId,
          allowed: true,
          action: "none",
          reason: "Unknown rule action",
          trustScore,
        };
    }
  }

  /**
   * Find applicable enforcement rule based on trust score
   */
  private findApplicableRule(trustScore: number): EnforcementRule | null {
    // Find the strictest rule that applies
    for (const rule of this.rules) {
      if (trustScore < rule.minTrustScore) {
        return rule;
      }
    }
    return null;
  }

  /**
   * Calculate ban expiry date
   */
  private calculateBanExpiry(durationDays: number): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + durationDays);
    return expiry;
  }

  /**
   * Check if programmer can commit
   */
  async canCommit(programmerId: string): Promise<boolean> {
    const decision = await this.enforceQualityStandards(programmerId);
    return decision.allowed && decision.action !== "block";
  }

  /**
   * Check if commit requires manual review
   */
  async requiresReview(programmerId: string): Promise<boolean> {
    const decision = await this.enforceQualityStandards(programmerId);
    return decision.action === "require_review";
  }

  /**
   * Get enforcement status for all programmers
   */
  async getEnforcementStatus(): Promise<EnforcementDecision[]> {
    const rankings = await repairHistoryService.getProgrammerRankings();

    const decisions = await Promise.all(
      rankings.map(async (r: any) => {
        return await this.enforceQualityStandards(r.programmerId);
      })
    );

    return decisions;
  }
}

export const autoEnforcement = new AutoEnforcement();

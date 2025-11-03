import { runHonestyAudit } from './honesty-auditor';
import { verifyReality } from './reality-verifier';
import { enforceIntegrity } from './integrity-enforcer';
import { validateAutonomy } from './autonomy-validator';
import { logIntegrityCycle } from './ledger-logger';
import { repairFakeModules } from './repair-engine';
import { verifyRepairedModules } from './verifier-engine';
import { learnFromRepair } from './learning-engine';
import { runAdaptiveEvolution } from './evolution-adaptive';
import { runPredictiveAdaptation } from './predictive-adaptation';
import { logEvolutionCycle } from './evolution-ledger';
import { db } from '../db';
import { integrityReports } from '@shared/schema';

let cycleCounter = 0;

export async function runFullIntegrityCycle() {
  const startTime = Date.now();
  cycleCounter++;
  
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🔍 [IntegrityHub] Phase Ω.8: Predictive Adaptation`);
  console.log(`   Cycle #${cycleCounter} - Discovery → Repair → Verify → Learn → Evolve → Predict`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  const honesty = await runHonestyAudit();
  const reality = await verifyReality(honesty);
  const enforcement = await enforceIntegrity(reality);
  
  // Phase Ω.5: Repair fake modules
  const repair = await repairFakeModules(reality.failed);
  
  // Phase Ω.5: Verify repaired modules
  const verification = await verifyRepairedModules(repair.repaired);
  
  // Phase Ω.6: Learn from repairs
  const learning = await learnFromRepair(repair, verification);
  
  // Phase Ω.7: Adaptive Evolution - apply learned patterns
  const evolution = await runAdaptiveEvolution();
  
  // Phase Ω.8: Predictive Adaptation - predict future issues
  const prediction = await runPredictiveAdaptation();
  
  const autonomy = await validateAutonomy(enforcement);
  
  const executionTime = Date.now() - startTime;
  
  // Determine overall status
  const autonomyScore = parseFloat(autonomy.score.toFixed(2));
  let overallStatus = 'healthy';
  if (autonomyScore < 70) overallStatus = 'critical';
  else if (autonomyScore < 90) overallStatus = 'warning';
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  // Phase Ω.6: Learning insights
  if (learning.insights && learning.insights.length > 0) {
    learning.insights.forEach(insight => recommendations.push(insight));
  }
  
  // Phase Ω.5 recommendations
  if (repair.repaired.length > 0) {
    recommendations.push(`✅ Successfully repaired ${repair.repaired.length} fake modules`);
  }
  if (verification.verified.length > 0) {
    recommendations.push(`✅ Verified ${verification.verified.length} repaired modules working correctly`);
  }
  if (verification.failed.length > 0) {
    recommendations.push(`⚠️ ${verification.failed.length} repaired modules failed verification - needs review`);
  }
  if (repair.skipped.length > 0) {
    recommendations.push(`📝 ${repair.skipped.length} modules skipped (no templates available)`);
  }
  if (reality.failed.length > repair.repaired.length) {
    recommendations.push(`Fix ${reality.failed.length - repair.repaired.length} remaining critical modules`);
  }
  if (autonomyScore < 95) {
    recommendations.push(`Improve autonomy score from ${autonomyScore}% to 95%+`);
  }
  
  // Phase Ω.6: Knowledge growth
  if (learning.knowledgeGrowth > 10) {
    recommendations.push(`📚 Knowledge base growing rapidly: ${learning.knowledgeGrowth.toFixed(1)}% growth this cycle`);
  }
  
  // Phase Ω.7: Evolution suggestions
  if (evolution.suggestions.length > 0) {
    recommendations.push(`🧬 Generated ${evolution.suggestions.length} evolution suggestions (avg confidence: ${evolution.confidenceAvg.toFixed(0)}%)`);
  }
  if (evolution.patternsDetected > 0) {
    recommendations.push(`🔍 Detected ${evolution.patternsDetected} improvement patterns from learned lessons`);
  }
  
  // Phase Ω.8: Predictive insights
  if (prediction.totalFilesAtRisk > 0) {
    recommendations.push(`🔮 ${prediction.totalFilesAtRisk} files predicted to need attention (${prediction.confidenceScore}% confidence)`);
  }
  if (prediction.riskPatterns.length > 0) {
    const topPattern = prediction.riskPatterns[0];
    recommendations.push(`⚠️ Top risk pattern: '${topPattern.pattern}' (detected ${topPattern.count}x, ${topPattern.risk} risk)`);
  }
  
  // Save to database
  try {
    await db.insert(integrityReports).values({
      cycleNumber: cycleCounter,
      fakeModulesCount: honesty.fakeModules.length,
      fakeModules: honesty.fakeModules,
      criticalFailuresCount: reality.failed.length,
      criticalFailures: reality.failed,
      isolatedModulesCount: enforcement.isolated.length,
      isolatedModules: enforcement.isolated,
      repairedModulesCount: repair.repaired.length,
      repairedModules: repair.repaired,
      verifiedModulesCount: verification.verified.length,
      verifiedModules: verification.verified,
      autonomyScore: autonomyScore.toString(),
      totalModules: autonomy.totalModules,
      overallStatus,
      recommendations,
      executionTime,
    });
    
    console.log(`💾 [IntegrityHub] Report #${cycleCounter} saved to database`);
  } catch (error) {
    console.error('❌ [IntegrityHub] Failed to save report:', error);
  }

  const report = {
    cycleNumber: cycleCounter,
    honesty,
    reality,
    enforcement,
    repair,
    verification,
    learning,
    evolution,
    prediction,
    autonomy,
    overallStatus,
    recommendations,
    executionTime
  };

  await logIntegrityCycle(report);
  await logEvolutionCycle(report);

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ [IntegrityHub] Phase Ω.8 Cycle #${cycleCounter} completed`);
  console.log(`   📊 Stats:`);
  console.log(`      Fake Modules: ${honesty.fakeModules.length}`);
  console.log(`      Critical Failures: ${reality.failed.length}`);
  console.log(`      🔧 Repaired: ${repair.repaired.length}`);
  console.log(`      ✅ Verified: ${verification.verified.length}`);
  console.log(`      ❌ Failed Verification: ${verification.failed.length}`);
  console.log(`      📚 New Learnings: ${learning.newLearnings}`);
  console.log(`      🧠 Total Knowledge: ${learning.totalLearnings}`);
  console.log(`      📈 Knowledge Growth: ${learning.knowledgeGrowth.toFixed(1)}%`);
  console.log(`      🧬 Evolution Suggestions: ${evolution.suggestions.length}`);
  console.log(`      🔍 Patterns Detected: ${evolution.patternsDetected}`);
  console.log(`      🔮 Files at Risk: ${prediction.totalFilesAtRisk}`);
  console.log(`      🎯 Prediction Confidence: ${prediction.confidenceScore}%`);
  console.log(`      💯 Autonomy: ${autonomyScore}%`);
  console.log(`   ⏱️ Time: ${executionTime}ms`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  return report;
}

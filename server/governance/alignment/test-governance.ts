/**
 * Phase Ω.9: Governance System Test
 * 
 * Test script to validate the decision alignment system
 */

import { alignDecision } from './decision-aligner';
import { validateRepairAction, validateEvolutionSuggestion, validatePredictiveAction } from './governance-middleware';

/**
 * Test governance system
 */
export async function testGovernanceSystem() {
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🧪 [Test] Phase Ω.9: Governance System Test`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // Test 1: Safe repair action (should approve)
  console.log(`\n📝 Test 1: Safe Repair Action`);
  const test1 = await validateRepairAction(
    'repair fake module',
    'client/src/components/test.tsx',
    'Replace mock data with real API calls'
  );
  console.log(`Result: ${test1.approved ? '✅ APPROVED' : '🚫 BLOCKED'}`);
  console.log(`Score: ${test1.score.toFixed(2)}`);

  // Test 2: Risky destructive action (should block)
  console.log(`\n📝 Test 2: Risky Destructive Action`);
  const test2 = await alignDecision({
    action: 'delete nucleus',
    description: 'Permanently remove critical nucleus without backup',
    impact: 'Irreversible system damage',
    target: 'core-nucleus'
  });
  console.log(`Result: ${test2.approved ? '✅ APPROVED' : '🚫 BLOCKED'}`);
  console.log(`Score: ${test2.score.toFixed(2)}`);

  // Test 3: Evolution suggestion (should approve if high confidence)
  console.log(`\n📝 Test 3: Evolution Suggestion`);
  const test3 = await validateEvolutionSuggestion({
    action: 'improve error handling',
    file: 'server/api/users.ts',
    description: 'Add try-catch blocks based on learned patterns',
    confidence: 85
  });
  console.log(`Result: ${test3.approved ? '✅ APPROVED' : '🚫 BLOCKED'}`);
  console.log(`Score: ${test3.score.toFixed(2)}`);

  // Test 4: Predictive action (should approve)
  console.log(`\n📝 Test 4: Predictive Action`);
  const test4 = await validatePredictiveAction({
    action: 'add validation',
    file: 'server/routes/api.ts',
    riskPattern: 'missing input validation',
    confidence: 72
  });
  console.log(`Result: ${test4.approved ? '✅ APPROVED' : '🚫 BLOCKED'}`);
  console.log(`Score: ${test4.score.toFixed(2)}`);

  // Test 5: Mixed impact action
  console.log(`\n📝 Test 5: Mixed Impact Action`);
  const test5 = await alignDecision({
    action: 'update schema',
    description: 'Modify database schema with migration plan and rollback',
    impact: 'Improves data structure but requires careful execution',
    target: 'database',
    alternatives: ['Add new table instead', 'Use migration tool']
  });
  console.log(`Result: ${test5.approved ? '✅ APPROVED' : '🚫 BLOCKED'}`);
  console.log(`Score: ${test5.score.toFixed(2)}`);

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ [Test] Phase Ω.9 Governance System Test Complete`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  return {
    test1: test1.approved,
    test2: test2.approved,
    test3: test3.approved,
    test4: test4.approved,
    test5: test5.approved
  };
}

// Run test if this file is executed directly
testGovernanceSystem()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });

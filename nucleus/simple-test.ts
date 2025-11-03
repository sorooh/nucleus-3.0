/**
 * 🎯 Simple Test Runner - مشغل الاختبار البسيط
 * Easy way to test the Nucleus Professional system
 */

import { runCompleteDemo, quickSystemTest } from './nucleus-professional-complete';

async function runSimpleTest() {
  console.log('🌟 Nucleus Professional 3.0 - Simple Test');
  console.log('=========================================\n');

  try {
    console.log('🔥 Running Quick System Test...');
    const testResult = await quickSystemTest();
    
    if (testResult) {
      console.log('✅ Quick Test PASSED!');
      console.log('\n🎬 Running Complete Demo...');
      await runCompleteDemo();
      console.log('\n🎉 All tests completed successfully!');
    } else {
      console.log('❌ Quick Test FAILED!');
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

// Auto-run the test
runSimpleTest();

export { runSimpleTest };
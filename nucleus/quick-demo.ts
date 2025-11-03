/**
 * 🚀 Quick Start Demo - عرض توضيحي سريع
 * Simple script to demonstrate Nucleus Professional 3.0 capabilities
 */

import { runFullDemo, quickTest } from './nucleus-professional-test-suite';

async function main() {
  console.log('🌟 Nucleus Professional 3.0 - Quick Demo');
  console.log('==========================================\n');

  try {
    console.log('🔥 Starting Quick Smoke Test...');
    const quickResult = await quickTest();
    
    if (quickResult) {
      console.log('✅ Quick Test PASSED - System is working!');
      console.log('\n🎬 Running Full System Demo...');
      await runFullDemo();
    } else {
      console.log('❌ Quick Test FAILED - Please check system configuration');
    }
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run if this file is executed directly
// Note: Uncomment the following lines if running directly with Node.js
// if (require.main === module) {
//   main();
// }

export { main as runQuickDemo };
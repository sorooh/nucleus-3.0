/**
 * 🚀 Quick Unified Launch - تشغيل سريع للنظام الموحد
 * Simple launcher for the complete unified Nicholas Empire system
 */

import { launchUnifiedNicholas, testUnifiedSystem } from './unified-nicholas-empire.js';

async function main() {
  console.log('🌟 Nicholas Empire - Unified Launch');
  console.log('==================================\n');

  try {
    console.log('🔥 Starting unified system test...');
    const testResult = await testUnifiedSystem();
    
    if (testResult) {
      console.log('✅ Unified system test PASSED!');
      console.log('\n🎉 Nicholas Empire is unified and running!');
      
      console.log('\n🎯 Access your unified system at:');
      console.log('  • Nicholas Core: http://localhost:5000');
      console.log('  • Unified API: http://localhost:8000');
      console.log('  • Empire Runner: http://localhost:3001');
      
    } else {
      console.log('❌ Unified system test FAILED!');
    }
    
  } catch (error) {
    console.error('❌ Failed to launch unified system:', error);
  }
}

// Auto-run if this file is executed directly
main();

export { main as launchUnified };
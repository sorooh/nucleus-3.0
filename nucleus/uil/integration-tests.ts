/**
 * UIL Integration Tests Suite - Production-Ready Scenarios
 * Nucleus 3.1.1
 * 
 * Tests 10 real-world scenarios across all task types
 */

import {
  UIL_complete,
  UIL_analyze,
  UIL_chat,
  UIL_summarize,
  UIL_plan,
  UIL_code,
  UIL_health,
  type UILResponse
} from './UIL';

// Test results tracking
interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  provider?: string;
  error?: string;
  output?: string;
}

const results: TestResult[] = [];

// Colors for output
const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
};

function log(message: string) {
  console.log(colors.cyan(`[UIL-INTEGRATION] ${message}`));
}

async function runTest(
  name: string,
  testFn: () => Promise<UILResponse>
): Promise<void> {
  const startTime = Date.now();
  
  try {
    log(`Running: ${name}...`);
    const result = await testFn();
    const duration = Date.now() - startTime;
    
    results.push({
      name,
      status: 'pass',
      duration,
      provider: result.provider,
      output: result.output.substring(0, 100)
    });
    
    console.log(colors.green(`✅ PASS: ${name}`));
    console.log(`   Provider: ${result.provider}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Output: ${result.output.substring(0, 80)}...`);
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    results.push({
      name,
      status: 'fail',
      duration,
      error: error.error || error.message
    });
    
    console.log(colors.red(`❌ FAIL: ${name}`));
    console.log(colors.red(`   Error: ${error.error || error.message}`));
  }
  
  console.log(''); // Blank line
}

/**
 * Scenario 1: Accounting - Monthly P&L Analysis
 */
async function test_accounting_analysis() {
  return await UIL_analyze(
    "Analyze the following P&L data and identify key trends:\n" +
    "Revenue: $125K (up 15% from last month)\n" +
    "COGS: $45K (up 8%)\n" +
    "Operating Expenses: $60K (up 12%)\n" +
    "Net Profit: $20K (up 18%)\n" +
    "Provide 3 key insights.",
    { module: "accounting", report: "P&L", month: "Q3-2025" }
  );
}

/**
 * Scenario 2: Customer Support - Arabic Conversation
 */
async function test_support_arabic_chat() {
  return await UIL_chat(
    "مرحباً! أحتاج مساعدة في فهم فاتورتي الأخيرة. لماذا المبلغ أعلى من المعتاد؟",
    { module: "support", lang: "ar", customerId: "12345" }
  );
}

/**
 * Scenario 3: Marketing - Campaign Summary
 */
async function test_marketing_summary() {
  return await UIL_summarize(
    "Summarize this marketing campaign performance in 2 sentences:\n" +
    "Campaign: Q3 Social Media Boost\n" +
    "Budget: $50,000\n" +
    "Impressions: 2.5M\n" +
    "Clicks: 125K (CTR 5%)\n" +
    "Conversions: 3,500 (2.8% conversion rate)\n" +
    "Revenue: $175K\n" +
    "ROI: 250%",
    { module: "marketing", campaign: "Q3-Social" }
  );
}

/**
 * Scenario 4: Procurement - Supplier Evaluation Plan
 */
async function test_procurement_planning() {
  return await UIL_plan(
    "Create a 4-step plan to evaluate and select a new supplier for raw materials. " +
    "Consider: pricing, quality, delivery reliability, and sustainability.",
    { module: "procurement", action: "supplier_selection" }
  );
}

/**
 * Scenario 5: Development - Code Generation
 */
async function test_development_coding() {
  return await UIL_code(
    "Write a TypeScript function that validates an email address using regex. " +
    "Include error handling and return a boolean. Keep it simple.",
    { module: "development", language: "typescript" }
  );
}

/**
 * Scenario 6: HR - Employee Performance Analysis
 */
async function test_hr_analysis() {
  return await UIL_analyze(
    "Analyze employee performance metrics:\n" +
    "- Average productivity: 87% (target: 85%)\n" +
    "- Employee satisfaction: 78% (down 5% from last quarter)\n" +
    "- Turnover rate: 12% (up 3%)\n" +
    "- Training completion: 92%\n" +
    "What should HR focus on?",
    { module: "hr", report: "performance", quarter: "Q3-2025" }
  );
}

/**
 * Scenario 7: Sales - Multilingual Chat (English)
 */
async function test_sales_chat() {
  return await UIL_chat(
    "Hi! I'm interested in your Enterprise plan. Can you explain the key differences " +
    "from the Professional plan in 3 bullet points?",
    { module: "sales", lang: "en", product: "enterprise" }
  );
}

/**
 * Scenario 8: Operations - Process Summary
 */
async function test_operations_summary() {
  return await UIL_summarize(
    "Summarize this manufacturing process in one paragraph:\n" +
    "1. Raw material inspection (QC pass rate: 95%)\n" +
    "2. Assembly line production (throughput: 1,000 units/day)\n" +
    "3. Quality testing (defect rate: 2%)\n" +
    "4. Packaging and labeling (automated 80%)\n" +
    "5. Shipping preparation (average lead time: 48 hours)",
    { module: "operations", process: "manufacturing" }
  );
}

/**
 * Scenario 9: Strategy - Business Roadmap
 */
async function test_strategy_planning() {
  return await UIL_plan(
    "Create a high-level 6-month strategic roadmap for a SaaS company " +
    "looking to expand from 100 to 500 customers. Include: product, marketing, " +
    "hiring, and infrastructure milestones.",
    { module: "strategy", timeframe: "6-months", target: "5x-growth" }
  );
}

/**
 * Scenario 10: IT - Database Schema Code
 */
async function test_it_coding() {
  return await UIL_code(
    "Write a Drizzle ORM schema for a 'customers' table with: id (serial), " +
    "name (varchar), email (unique), createdAt (timestamp). Use PostgreSQL syntax.",
    { module: "it", framework: "drizzle", database: "postgresql" }
  );
}

/**
 * Run all integration tests
 */
async function runAllTests() {
  console.log(colors.blue("\n" + "=".repeat(60)));
  console.log(colors.blue("   UIL INTEGRATION TESTS - PRODUCTION SCENARIOS"));
  console.log(colors.blue("   Nucleus 3.1.1"));
  console.log(colors.blue("=".repeat(60) + "\n"));
  
  // Check health first
  log("Checking UIL and Bridge health...");
  try {
    const health = await UIL_health();
    if (health.healthy) {
      console.log(colors.green("✅ Bridge is healthy and ready"));
      console.log(`   Mode: ${health.bridge.mode}`);
      console.log(`   Providers: ${Object.keys(health.bridge.providers || {}).length}`);
    } else {
      console.log(colors.yellow("⚠️  Bridge is not healthy"));
      console.log(colors.yellow(`   Error: ${health.error}`));
      console.log(colors.yellow("   Tests will run but may fail\n"));
    }
  } catch (error: any) {
    console.log(colors.red("❌ Cannot connect to Bridge"));
    console.log(colors.red(`   Error: ${error.message}`));
    console.log(colors.red("   Please start Bridge first: python3 ai-bridge/bridge_enhanced.py --port 7010\n"));
  }
  
  console.log(colors.blue("\nRunning 10 real-world scenarios...\n"));
  
  const startTime = Date.now();
  
  // Scenario 1: Accounting
  await runTest("Scenario 1: Accounting P&L Analysis", test_accounting_analysis);
  await delay(2000);
  
  // Scenario 2: Customer Support (Arabic)
  await runTest("Scenario 2: Customer Support (Arabic Chat)", test_support_arabic_chat);
  await delay(2000);
  
  // Scenario 3: Marketing
  await runTest("Scenario 3: Marketing Campaign Summary", test_marketing_summary);
  await delay(2000);
  
  // Scenario 4: Procurement
  await runTest("Scenario 4: Procurement Planning", test_procurement_planning);
  await delay(2000);
  
  // Scenario 5: Development
  await runTest("Scenario 5: Development Code Generation", test_development_coding);
  await delay(2000);
  
  // Scenario 6: HR
  await runTest("Scenario 6: HR Performance Analysis", test_hr_analysis);
  await delay(2000);
  
  // Scenario 7: Sales
  await runTest("Scenario 7: Sales Chat (English)", test_sales_chat);
  await delay(2000);
  
  // Scenario 8: Operations
  await runTest("Scenario 8: Operations Process Summary", test_operations_summary);
  await delay(2000);
  
  // Scenario 9: Strategy
  await runTest("Scenario 9: Strategy Roadmap Planning", test_strategy_planning);
  await delay(2000);
  
  // Scenario 10: IT
  await runTest("Scenario 10: IT Database Schema Code", test_it_coding);
  
  const totalDuration = Date.now() - startTime;
  
  // Print results
  printResults(totalDuration);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function printResults(totalDuration: number) {
  console.log(colors.blue("\n" + "=".repeat(60)));
  console.log(colors.blue("   TEST RESULTS"));
  console.log(colors.blue("=".repeat(60)));
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  
  console.log(colors.green(`✅ Passed: ${passed}/10`));
  console.log(colors.red(`❌ Failed: ${failed}/10`));
  console.log(colors.yellow(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`));
  
  // Performance stats
  if (passed > 0) {
    const avgDuration = results
      .filter(r => r.status === 'pass')
      .reduce((sum, r) => sum + r.duration, 0) / passed;
    
    console.log(colors.cyan(`📊 Avg Response Time: ${avgDuration.toFixed(0)}ms`));
  }
  
  // Provider distribution
  const providers: Record<string, number> = {};
  results.forEach(r => {
    if (r.provider) {
      providers[r.provider] = (providers[r.provider] || 0) + 1;
    }
  });
  
  if (Object.keys(providers).length > 0) {
    console.log(colors.cyan("\n📡 Provider Distribution:"));
    Object.entries(providers).forEach(([provider, count]) => {
      console.log(`   ${provider}: ${count} requests`);
    });
  }
  
  // Failed tests details
  if (failed > 0) {
    console.log(colors.red("\n❌ Failed Tests:"));
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(colors.red(`   • ${r.name}`));
      console.log(colors.red(`     Error: ${r.error}`));
    });
  }
  
  console.log(colors.blue("\n" + "=".repeat(60) + "\n"));
  
  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error(colors.red("Fatal error running integration tests:"), error);
    process.exit(1);
  });
}

export { runAllTests };

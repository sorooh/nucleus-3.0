/**
 * UIL Test Suite - Unified Intelligence Layer
 * Nucleus 3.1.1
 */

import {
  UIL_complete,
  UIL_analyze,
  UIL_chat,
  UIL_summarize,
  UIL_plan,
  UIL_code,
  UIL_health,
  UIL_stats,
  type UILRequest,
  type UILResponse,
  type UILError
} from './UIL';

// Color output helpers
const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
};

let passed = 0;
let failed = 0;

function log(message: string) {
  console.log(`[UIL-TEST] ${message}`);
}

function success(test: string) {
  passed++;
  console.log(colors.green(`✅ PASS: ${test}`));
}

function fail(test: string, error: any) {
  failed++;
  console.log(colors.red(`❌ FAIL: ${test}`));
  console.log(colors.red(`   Error: ${error.message || error.error || error}`));
}

async function test_health() {
  try {
    log("Testing UIL_health()...");
    const health = await UIL_health();
    
    if (health.healthy) {
      success("UIL_health - Bridge is healthy");
      console.log(`   Mode: ${health.bridge.mode}`);
      console.log(`   Providers: ${Object.keys(health.bridge.providers || {}).length}`);
    } else {
      fail("UIL_health - Bridge is unhealthy", new Error(health.error || "Unknown"));
    }
  } catch (error) {
    fail("UIL_health", error);
  }
}

async function test_analyze() {
  try {
    log("Testing UIL_analyze()...");
    const result: UILResponse = await UIL_analyze(
      "What are the top 3 benefits of AI in healthcare? Be concise.",
      { module: "test", test_id: "analyze_001" }
    );
    
    if (result.output && result.output.length > 10) {
      success("UIL_analyze - Got valid response");
      console.log(`   Provider: ${result.provider}`);
      console.log(`   Latency: ${result.latency_ms}ms`);
      console.log(`   Output length: ${result.output.length} chars`);
      console.log(`   Preview: ${result.output.substring(0, 100)}...`);
    } else {
      fail("UIL_analyze - Invalid response", new Error("Output too short"));
    }
  } catch (error) {
    fail("UIL_analyze", error);
  }
}

async function test_chat() {
  try {
    log("Testing UIL_chat()...");
    const result: UILResponse = await UIL_chat(
      "Hello! Say 'Testing UIL chat' in exactly 3 words.",
      { module: "test", test_id: "chat_001" }
    );
    
    if (result.output) {
      success("UIL_chat - Got valid response");
      console.log(`   Provider: ${result.provider}`);
      console.log(`   Latency: ${result.latency_ms}ms`);
      console.log(`   Output: ${result.output}`);
    } else {
      fail("UIL_chat - No output", new Error("Empty response"));
    }
  } catch (error) {
    fail("UIL_chat", error);
  }
}

async function test_summarize() {
  try {
    log("Testing UIL_summarize()...");
    const longText = `
      Artificial intelligence (AI) is transforming healthcare in numerous ways.
      From diagnostic assistance to drug discovery, AI systems are helping doctors
      make better decisions. Machine learning algorithms can analyze medical images
      faster and often more accurately than humans. Natural language processing
      helps extract insights from medical records. Predictive analytics can identify
      patients at risk of certain conditions before symptoms appear.
    `;
    
    const result: UILResponse = await UIL_summarize(
      `Summarize this in exactly 2 sentences: ${longText}`,
      { module: "test", test_id: "summarize_001" }
    );
    
    if (result.output && result.output.length < longText.length) {
      success("UIL_summarize - Got valid summary");
      console.log(`   Provider: ${result.provider}`);
      console.log(`   Latency: ${result.latency_ms}ms`);
      console.log(`   Summary: ${result.output}`);
    } else {
      fail("UIL_summarize - Invalid summary", new Error("Not a proper summary"));
    }
  } catch (error) {
    fail("UIL_summarize", error);
  }
}

async function test_plan() {
  try {
    log("Testing UIL_plan()...");
    const result: UILResponse = await UIL_plan(
      "Create a simple 3-step plan to launch a new product. Be concise.",
      { module: "test", test_id: "plan_001" }
    );
    
    if (result.output && result.output.length > 20) {
      success("UIL_plan - Got valid plan");
      console.log(`   Provider: ${result.provider}`);
      console.log(`   Latency: ${result.latency_ms}ms`);
      console.log(`   Plan preview: ${result.output.substring(0, 150)}...`);
    } else {
      fail("UIL_plan - Invalid plan", new Error("Output too short"));
    }
  } catch (error) {
    fail("UIL_plan", error);
  }
}

async function test_code() {
  try {
    log("Testing UIL_code()...");
    const result: UILResponse = await UIL_code(
      "Write a simple JavaScript function that adds two numbers. Just the function, no explanation.",
      { module: "test", test_id: "code_001" }
    );
    
    if (result.output && result.output.includes("function")) {
      success("UIL_code - Got valid code");
      console.log(`   Provider: ${result.provider}`);
      console.log(`   Latency: ${result.latency_ms}ms`);
      console.log(`   Code: ${result.output.substring(0, 200)}...`);
    } else {
      fail("UIL_code - Invalid code", new Error("No function found"));
    }
  } catch (error) {
    fail("UIL_code", error);
  }
}

async function test_complete_all_types() {
  const taskTypes: Array<"analysis" | "conversation" | "summarization" | "planning" | "coding"> = [
    "analysis",
    "conversation",
    "summarization",
    "planning",
    "coding"
  ];
  
  for (const taskType of taskTypes) {
    try {
      log(`Testing UIL_complete with taskType=${taskType}...`);
      const result = await UIL_complete({
        taskType,
        prompt: "Say 'Hello' in exactly 1 word.",
        maxTokens: 20,
        temperature: 0.1
      });
      
      if (result.output) {
        success(`UIL_complete(${taskType}) - Valid response`);
        console.log(`   Provider: ${result.provider}, Latency: ${result.latency_ms}ms`);
      } else {
        fail(`UIL_complete(${taskType})`, new Error("No output"));
      }
    } catch (error) {
      fail(`UIL_complete(${taskType})`, error);
    }
  }
}

async function test_error_handling() {
  try {
    log("Testing error handling with invalid prompt...");
    
    // Try with empty prompt (should fail validation at API level)
    try {
      await UIL_complete({
        taskType: "analysis",
        prompt: "",  // Invalid
        maxTokens: 10
      });
      fail("Error handling - Should have thrown error", new Error("No error thrown"));
    } catch (error: any) {
      if (error.error || error.message) {
        success("Error handling - Properly caught invalid input");
        console.log(`   Error message: ${error.error || error.message}`);
      } else {
        fail("Error handling - Wrong error format", error);
      }
    }
  } catch (error) {
    fail("Error handling test", error);
  }
}

async function test_stats() {
  try {
    log("Testing UIL_stats()...");
    const stats = await UIL_stats();
    
    if (stats) {
      success("UIL_stats - Got statistics");
      console.log(`   Stats: ${JSON.stringify(stats, null, 2)}`);
    } else {
      fail("UIL_stats - No stats", new Error("Empty stats"));
    }
  } catch (error) {
    fail("UIL_stats", error);
  }
}

async function runAllTests() {
  console.log(colors.blue("\n========================================"));
  console.log(colors.blue("   UIL TEST SUITE - Nucleus 3.1.1"));
  console.log(colors.blue("========================================\n"));
  
  const startTime = Date.now();
  
  // Run tests sequentially to avoid rate limiting
  await test_health();
  await new Promise(r => setTimeout(r, 1000));
  
  await test_analyze();
  await new Promise(r => setTimeout(r, 2000));
  
  await test_chat();
  await new Promise(r => setTimeout(r, 2000));
  
  await test_summarize();
  await new Promise(r => setTimeout(r, 2000));
  
  await test_plan();
  await new Promise(r => setTimeout(r, 2000));
  
  await test_code();
  await new Promise(r => setTimeout(r, 2000));
  
  await test_complete_all_types();
  await new Promise(r => setTimeout(r, 1000));
  
  await test_error_handling();
  await new Promise(r => setTimeout(r, 1000));
  
  await test_stats();
  
  const duration = Date.now() - startTime;
  
  console.log(colors.blue("\n========================================"));
  console.log(colors.blue("   TEST RESULTS"));
  console.log(colors.blue("========================================"));
  console.log(colors.green(`✅ Passed: ${passed}`));
  console.log(colors.red(`❌ Failed: ${failed}`));
  console.log(colors.yellow(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`));
  console.log(colors.blue("========================================\n"));
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error(colors.red("Fatal error running tests:"), error);
    process.exit(1);
  });
}

export { runAllTests };

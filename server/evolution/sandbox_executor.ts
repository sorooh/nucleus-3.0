/**
 * Phase Ω.5 - Real Sandbox Executor
 * Executes real tests without simulation
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface TestConfig {
  path: string;
  kind: 'python' | 'node';
}

export interface TestResult {
  ok: boolean;
  exitCode: number;
  output: string;
}

function runCommand(cmd: string, args: string[], cwd: string, timeout: number = 120000): Promise<{ exitCode: number; output: string }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { cwd, shell: true });
    let output = '';

    proc.stdout?.on('data', (data) => { output += data.toString(); });
    proc.stderr?.on('data', (data) => { output += data.toString(); });

    proc.on('close', (code) => {
      resolve({ exitCode: code || 0, output: output.slice(-8000) });
    });

    proc.on('error', (err) => {
      resolve({ exitCode: 1, output: `Error: ${err.message}` });
    });

    setTimeout(() => {
      proc.kill();
      resolve({ exitCode: 124, output: output + '\n[TIMEOUT]' });
    }, timeout);
  });
}

export async function runTests(config: TestConfig): Promise<TestResult> {
  const { path: testPath, kind } = config;
  const cwd = path.resolve(testPath);

  // Create reports directory
  const reportsDir = path.join(cwd, '.reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  let cmd: string;
  let args: string[];

  if (kind === 'python') {
    cmd = 'pytest';
    args = ['-q', '--maxfail=1', '--disable-warnings', `--junitxml=${reportsDir}/junit.xml`];
  } else {
    cmd = 'npm';
    args = ['test', '--', '--ci', '--reporters=jest-junit'];
  }

  const proc = await runCommand(cmd, args, cwd);

  return {
    ok: proc.exitCode === 0,
    exitCode: proc.exitCode,
    output: proc.output
  };
}

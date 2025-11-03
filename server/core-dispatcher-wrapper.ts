/**
 * 🧠 Core Dispatcher Wrapper - TypeScript Bridge to Python Core
 * استدعاء نواة التنفيذ Python من Express
 */

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface DispatchRequest {
  task: string;
  payload?: Record<string, any>;
}

interface DispatchResult {
  success: boolean;
  task?: string;
  bot?: string;
  result?: any;
  error?: string;
  requires_approval?: boolean;
}

export class CoreDispatcherBridge {
  private pythonPath: string;
  private scriptPath: string;

  constructor() {
    this.pythonPath = 'python3';
    this.scriptPath = join(__dirname, 'core', 'cli.py');
  }

  async dispatch(request: DispatchRequest): Promise<DispatchResult> {
    return new Promise((resolve, reject) => {
      const args = [
        this.scriptPath,
        'dispatch',
        '--task', request.task,
      ];

      if (request.payload) {
        args.push('--payload', JSON.stringify(request.payload));
      }

      const process = spawn(this.pythonPath, args);
      
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${stdout}`));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  }

  async healthCheck(): Promise<any> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonPath, [this.scriptPath, 'health']);
      
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${stdout}`));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  }
}

export const coreDispatcher = new CoreDispatcherBridge();

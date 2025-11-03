/**
 * GPU Control Module for RunPod Integration
 * Controls GPU Pod lifecycle (start/stop/status) via RunPod GraphQL API
 */

interface GPUStatus {
  id: string;
  status: 'RUNNING' | 'STOPPED' | 'STOPPING' | 'STARTING' | 'UNKNOWN';
  gpuType?: string;
  memoryUsage?: number;
  uptimeSeconds?: number;
  lastSeen?: string;
}

interface RunPodResponse {
  data?: any;
  errors?: Array<{ message: string }>;
}

export class GPUController {
  private apiKey: string;
  private podId: string;
  private apiEndpoint: string = 'https://api.runpod.io/graphql';
  private lastUsedAt: Date | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private readonly IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  constructor(apiKey?: string, podId?: string) {
    this.apiKey = apiKey || process.env.RUNPOD_API_KEY || '';
    this.podId = podId || process.env.POD_ID || '';

    if (!this.apiKey || !this.podId) {
      console.warn('[GPUController] Missing RUNPOD_API_KEY or POD_ID - GPU control disabled');
    }
  }

  private async graphql(query: string): Promise<RunPodResponse> {
    if (!this.apiKey || !this.podId) {
      throw new Error('RunPod credentials not configured');
    }

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`RunPod API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('[GPUController] GraphQL error:', error.message);
      throw error;
    }
  }

  /**
   * Start (Resume) GPU Pod
   */
  async start(): Promise<boolean> {
    console.log(`[GPUController] Starting GPU Pod: ${this.podId}`);
    
    const query = `mutation { resumePod(input: { podId: "${this.podId}" }) { id desiredStatus } }`;
    
    try {
      const result = await this.graphql(query);
      
      if (result.errors) {
        console.error('[GPUController] Start errors:', result.errors);
        return false;
      }

      console.log('[GPUController] GPU Pod started successfully');
      return true;
    } catch (error) {
      console.error('[GPUController] Failed to start GPU Pod:', error);
      return false;
    }
  }

  /**
   * Stop GPU Pod (to save costs during idle)
   */
  async stop(): Promise<boolean> {
    console.log(`[GPUController] Stopping GPU Pod: ${this.podId}`);
    
    const query = `mutation { stopPod(input: { podId: "${this.podId}" }) { id desiredStatus } }`;
    
    try {
      const result = await this.graphql(query);
      
      if (result.errors) {
        console.error('[GPUController] Stop errors:', result.errors);
        return false;
      }

      console.log('[GPUController] GPU Pod stopped successfully');
      return true;
    } catch (error) {
      console.error('[GPUController] Failed to stop GPU Pod:', error);
      return false;
    }
  }

  /**
   * Get external port mapping for Ollama (port 11434)
   */
  async getOllamaExternalPort(): Promise<number | null> {
    const query = `
      query {
        pod(input: { podId: "${this.podId}" }) {
          id
          machine {
            podHostId
          }
          ports {
            ip
            isIpPublic
            privatePort
            publicPort
            type
          }
        }
      }
    `;

    try {
      const result = await this.graphql(query);
      
      if (result.errors || !result.data?.pod) {
        console.error('[GPUController] Failed to get port mappings');
        return null;
      }

      const pod = result.data.pod;
      const ports = pod.ports || [];
      
      // Find port mapping for 11434 (Ollama)
      const ollamaPort = ports.find((p: any) => 
        p.privatePort === 11434 || p.publicPort === 11434
      );

      if (ollamaPort?.publicPort) {
        console.log(`[GPUController] Found Ollama external port: ${ollamaPort.publicPort}`);
        return ollamaPort.publicPort;
      }

      console.warn('[GPUController] Port 11434 not found in mappings');
      return null;
    } catch (error) {
      console.error('[GPUController] Failed to get port mappings:', error);
      return null;
    }
  }

  /**
   * Get GPU Pod status
   */
  async getStatus(): Promise<GPUStatus> {
    const query = `
      query {
        pod(input: { podId: "${this.podId}" }) {
          id
          desiredStatus
          runtime {
            uptimeInSeconds
            gpus {
              id
              gpuUtilPercent
              memoryUtilPercent
            }
          }
          lastStatusChange
        }
      }
    `;

    try {
      const result = await this.graphql(query);
      
      if (result.errors || !result.data?.pod) {
        return {
          id: this.podId,
          status: 'UNKNOWN'
        };
      }

      const pod = result.data.pod;
      const gpu = pod.runtime?.gpus?.[0];

      return {
        id: pod.id,
        status: pod.desiredStatus,
        gpuType: gpu?.id,
        memoryUsage: gpu?.memoryUtilPercent,
        uptimeSeconds: pod.runtime?.uptimeInSeconds,
        lastSeen: pod.lastStatusChange
      };
    } catch (error) {
      console.error('[GPUController] Failed to get status:', error);
      return {
        id: this.podId,
        status: 'UNKNOWN'
      };
    }
  }

  /**
   * Ensure GPU is running before processing requests
   */
  async ensureRunning(): Promise<boolean> {
    const status = await this.getStatus();
    
    if (status.status === 'RUNNING') {
      return true;
    }

    if (status.status === 'STOPPED') {
      console.log('[GPUController] GPU is stopped, starting...');
      const started = await this.start();
      
      if (started) {
        // Wait for pod to be fully ready (up to 60 seconds)
        for (let i = 0; i < 12; i++) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          const currentStatus = await this.getStatus();
          if (currentStatus.status === 'RUNNING') {
            console.log('[GPUController] GPU is now running');
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Record usage and reset idle timer
   */
  recordUsage(): void {
    this.lastUsedAt = new Date();
    this.resetIdleTimer();
  }

  /**
   * Start idle detection timer
   * Will auto-stop GPU after IDLE_TIMEOUT_MS of inactivity
   */
  private resetIdleTimer(): void {
    // Clear existing timer
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    // Start new timer
    this.idleTimer = setTimeout(async () => {
      console.log('[GPUController] 🔴 Idle timeout reached - stopping GPU to save costs');
      try {
        await this.stop();
        console.log('[GPUController] ✅ GPU stopped successfully after idle timeout');
      } catch (error) {
        console.error('[GPUController] ❌ Failed to stop GPU after idle timeout:', error);
      }
    }, this.IDLE_TIMEOUT_MS);

    console.log(`[GPUController] ⏱️  Idle timer reset - will auto-stop in ${this.IDLE_TIMEOUT_MS / 60000} minutes`);
  }

  /**
   * Get idle status
   */
  getIdleStatus() {
    if (!this.lastUsedAt) {
      return {
        idle: false,
        lastUsedAt: null,
        idleSeconds: 0,
        willStopIn: null
      };
    }

    const now = new Date();
    const idleMs = now.getTime() - this.lastUsedAt.getTime();
    const idleSeconds = Math.floor(idleMs / 1000);
    const willStopInMs = this.IDLE_TIMEOUT_MS - idleMs;
    const willStopInSeconds = Math.max(0, Math.floor(willStopInMs / 1000));

    return {
      idle: idleMs > 0,
      lastUsedAt: this.lastUsedAt.toISOString(),
      idleSeconds,
      willStopIn: willStopInSeconds > 0 ? willStopInSeconds : 0
    };
  }

  /**
   * Check if credentials are configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.podId);
  }

  /**
   * Get configuration info (safe - no secrets)
   */
  getInfo() {
    return {
      configured: this.isConfigured(),
      podId: this.podId ? `${this.podId.slice(0, 8)}...` : 'not-set',
      endpoint: this.apiEndpoint,
      idleTimeout: `${this.IDLE_TIMEOUT_MS / 60000} minutes`
    };
  }
}

// Singleton instance
let gpuController: GPUController | null = null;

export function getGPUController(): GPUController {
  if (!gpuController) {
    gpuController = new GPUController();
  }
  return gpuController;
}

export default GPUController;

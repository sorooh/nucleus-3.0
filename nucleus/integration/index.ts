/**
 * Integration Module - Unified Knowledge Bus
 * Built from absolute zero for Surooh Empire
 */

import { knowledgeBus } from './knowledge-bus';
import { memoryHub } from '../core/memory-hub';

/**
 * Initialize Unified Knowledge Bus and integrate with Memory Hub
 */
export async function initializeIntegration(): Promise<void> {
  try {
    console.log('[Integration] Initializing Unified Knowledge Bus...');

    // Activate Knowledge Bus
    knowledgeBus.activate();
    console.log('[Integration] 🔌 Knowledge Bus ready - Platforms will auto-connect on first message');

    // Connect WebSocket Server with Knowledge Bus
    const { websocketServer } = await import('../network/websocket-server');
    
    // Forward WebSocket messages to Knowledge Bus
    websocketServer.on('message-received', async ({ platform, message }) => {
      try {
        await knowledgeBus.receiveMessage(message);
        console.log(`[Integration] 🔌 WebSocket message from ${platform} forwarded to Knowledge Bus`);
      } catch (error: any) {
        console.error(`[Integration] Failed to forward WebSocket message:`, error.message);
      }
    });

    // Forward Knowledge Bus messages to WebSocket clients
    knowledgeBus.on('message-sent', ({ platform, message }) => {
      websocketServer.broadcastToPlatform(platform, message);
      console.log(`[Integration] 🔌 Knowledge Bus message sent to ${platform} via WebSocket`);
    });

    // Listen to Knowledge Bus events and forward to Memory Hub
    knowledgeBus.on('message-received', async ({ platform, message }) => {
      try {
        // Validate message metadata exists
        if (!message.metadata || !message.payload) {
          console.warn(`[Integration] Invalid message from ${platform}: missing metadata or payload`);
          return;
        }

        // Store received platform data in Memory Hub
        const priority = message.metadata.priority || 'MEDIUM';
        const confidence = priority === 'CRITICAL' ? 0.95 : (priority === 'HIGH' ? 0.85 : 0.75);

        await memoryHub.recordInsight({
          type: 'pattern',
          description: `${platform}: ${message.payload.summary || 'Data received'}`,
          confidence,
          sources: [platform],
          evidence: {
            platform,
            dataType: message.dataType,
            payload: message.payload,
            timestamp: message.timestamp,
            metadata: message.metadata
          }
        });

        console.log(`[Integration] 💾 Stored ${platform} data in Memory Hub`);
      } catch (error: any) {
        console.error(`[Integration] Failed to store ${platform} data:`, error.message);
      }
    });

    // Listen to Memory Hub insights and forward to platforms if needed
    memoryHub.on('insight-recorded', async (insight) => {
      try {
        // Check if insight should be shared with platforms
        if (insight.confidence >= 0.8) {
          // High confidence insights can be broadcast to connected platforms
          console.log(`[Integration] 🧠 High-confidence insight detected (${insight.confidence})`);
          
          // This could trigger automatic platform notifications
          // Implementation depends on business logic
        }
      } catch (error: any) {
        console.error('[Integration] Failed to process insight:', error.message);
      }
    });

    // Initialize Sync Scheduler for periodic synchronization
    const { syncScheduler } = await import('./sync-scheduler');
    
    // Start scheduler
    syncScheduler.start();

    // Handle sync events
    syncScheduler.on('sync-required', async ({ platform, timestamp }) => {
      try {
        console.log(`[Integration] 📅 Scheduled sync triggered for ${platform}`);
        
        // Emit to platform connector (if exists) or direct sync
        // This allows platforms to execute their sync logic
        knowledgeBus.emit('platform-sync', { platform, timestamp });
        
      } catch (error: any) {
        console.error(`[Integration] Sync failed for ${platform}:`, error.message);
      }
    });

    console.log('[Integration] ✅ Unified Knowledge Bus initialized');

  } catch (error: any) {
    console.error('[Integration] Failed to initialize:', error.message);
  }
}

export { knowledgeBus } from './knowledge-bus';
export * from './types';

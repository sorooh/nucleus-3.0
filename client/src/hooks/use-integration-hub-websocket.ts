/**
 * ═══════════════════════════════════════════════════════════
 * Integration Hub WebSocket Hook
 * ═══════════════════════════════════════════════════════════
 * Phase 3: Custom React hook for real-time platform updates
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface PlatformUpdate {
  id: string;
  displayName: string;
  status: string;
  health: string | null;
  timestamp: number;
}

interface WebSocketMessage {
  type: 'connected' | 'platform_update' | 'status_change' | 'new_connection' | 'subscribed' | 'pong' | 'error';
  clientId?: string;
  message?: string;
  platforms?: PlatformUpdate[];
  platformId?: string;
  status?: string;
  sourcePlatformId?: string;
  targetPlatformId?: string;
  platformIds?: string[];
  timestamp: number;
}

interface UseIntegrationHubWebSocketOptions {
  enabled?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  onPlatformUpdate?: (platforms: PlatformUpdate[]) => void;
  onStatusChange?: (platformId: string, status: string) => void;
  onNewConnection?: (sourcePlatformId: string, targetPlatformId: string) => void;
  onError?: (error: string) => void;
}

export function useIntegrationHubWebSocket(options: UseIntegrationHubWebSocketOptions = {}) {
  const {
    enabled = true,
    autoReconnect = true,
    reconnectInterval = 5000,
    onPlatformUpdate,
    onStatusChange,
    onNewConnection,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      // Determine WebSocket URL (ws:// for http, wss:// for https)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/integration-hub`;

      console.log('[IntegrationHub WS] 🔌 Connecting to:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[IntegrationHub WS] ✅ Connected');
        setIsConnected(true);

        // Subscribe to all platforms
        ws.send(JSON.stringify({
          type: 'subscribe',
          all: true
        }));

        // Start ping interval (every 30 seconds)
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);

        // Request immediate status
        ws.send(JSON.stringify({ type: 'get_status' }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'connected':
              console.log('[IntegrationHub WS] 🎉 Welcome message received');
              break;

            case 'platform_update':
              if (message.platforms && onPlatformUpdate) {
                onPlatformUpdate(message.platforms);
                setLastUpdate(Date.now());
              }
              break;

            case 'status_change':
              if (message.platformId && message.status && onStatusChange) {
                onStatusChange(message.platformId, message.status);
                setLastUpdate(Date.now());
              }
              break;

            case 'new_connection':
              if (message.sourcePlatformId && message.targetPlatformId && onNewConnection) {
                onNewConnection(message.sourcePlatformId, message.targetPlatformId);
                setLastUpdate(Date.now());
              }
              break;

            case 'subscribed':
              console.log('[IntegrationHub WS] 📡 Subscribed to platforms:', message.platformIds?.length || 0);
              break;

            case 'pong':
              // Heartbeat response
              break;

            case 'error':
              console.error('[IntegrationHub WS] ❌ Server error:', message.message);
              if (onError) {
                onError(message.message || 'Unknown error');
              }
              break;

            default:
              console.warn('[IntegrationHub WS] ⚠️ Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('[IntegrationHub WS] ❌ Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[IntegrationHub WS] ❌ WebSocket error:', error);
        setIsConnected(false);
        if (onError) {
          onError('WebSocket connection error');
        }
      };

      ws.onclose = () => {
        console.log('[IntegrationHub WS] 🔌 Disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Auto-reconnect
        if (autoReconnect && enabled) {
          console.log(`[IntegrationHub WS] 🔄 Reconnecting in ${reconnectInterval}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };
    } catch (error) {
      console.error('[IntegrationHub WS] ❌ Error creating WebSocket:', error);
      setIsConnected(false);
    }
  }, [enabled, autoReconnect, reconnectInterval, onPlatformUpdate, onStatusChange, onNewConnection, onError]);

  const disconnect = useCallback(() => {
    console.log('[IntegrationHub WS] 🔌 Disconnecting...');

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clear ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    lastUpdate,
    connect,
    disconnect,
  };
}

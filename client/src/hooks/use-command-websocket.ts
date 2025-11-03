/**
 * 🔌 Command Center WebSocket Hook
 * ==================================
 * Real-time updates for Command Center dashboards
 * 
 * Features:
 * - Auto-reconnection
 * - Event listeners
 * - Heartbeat monitoring
 * 
 * @supreme Nicholas commands in real-time
 */

import { useEffect, useState, useCallback, useRef } from 'react';

interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp: string;
}

interface UseCommandWebSocketOptions {
  onPlatformStatus?: (data: any) => void;
  onAlert?: (data: any) => void;
  onSIDEDistribution?: (data: any) => void;
  onHealthUpdate?: (data: any) => void;
  autoConnect?: boolean;
}

export function useCommandWebSocket(options: UseCommandWebSocketOptions = {}) {
  const {
    onPlatformStatus,
    onAlert,
    onSIDEDistribution,
    onHealthUpdate,
    autoConnect = true,
  } = options;

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[CommandWS] Already connected');
      return;
    }

    if (connecting) {
      console.log('[CommandWS] Connection already in progress');
      return;
    }

    setConnecting(true);
    console.log('[CommandWS] Connecting...');

    try {
      // Determine WebSocket URL based on current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/command`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[CommandWS] ✅ Connected');
        setConnected(true);
        setConnecting(false);

        // Start heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'heartbeat' }));
          }
        }, 30000); // Every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          console.log('[CommandWS] 📨 Message:', message.type);

          switch (message.type) {
            case 'platform_status':
              onPlatformStatus?.(message.data);
              break;
            case 'alert':
              onAlert?.(message.data);
              break;
            case 'side_distribution':
              onSIDEDistribution?.(message.data);
              break;
            case 'health_update':
              onHealthUpdate?.(message.data);
              break;
            case 'connected':
              console.log('[CommandWS] 🎮 Welcome:', message);
              break;
            case 'heartbeat_ack':
              // Silent heartbeat acknowledgment
              break;
            default:
              console.log('[CommandWS] Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('[CommandWS] Message parse error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[CommandWS] ❌ Error:', error);
        setConnecting(false);
      };

      ws.onclose = () => {
        console.log('[CommandWS] 🔌 Disconnected');
        setConnected(false);
        setConnecting(false);

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Auto-reconnect after 5 seconds
        if (autoConnect) {
          console.log('[CommandWS] ⏱️ Reconnecting in 5s...');
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[CommandWS] Connection failed:', error);
      setConnecting(false);
    }
  }, [autoConnect, onPlatformStatus, onAlert, onSIDEDistribution, onHealthUpdate, connecting]);

  const disconnect = useCallback(() => {
    console.log('[CommandWS] Disconnecting...');

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clear heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnected(false);
    setConnecting(false);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount/unmount

  return {
    connected,
    connecting,
    connect,
    disconnect,
  };
}

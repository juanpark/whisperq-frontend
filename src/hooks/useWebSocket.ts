import { useEffect, useRef, useCallback, useState } from 'react';
import { Client, type IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WS_URL, getReactionTopic } from '@/lib/api';
import { useReactionStore } from '@/stores/reactionStore';

interface UseWebSocketOptions {
  sessionId: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

// Backend sends: { sessionId, reactionCounts: { CONFUSED: n, MORE: n } }
// We need to handle both formats for flexibility
interface ReactionMessage {
  sessionId: string;
  // New format from backend
  reactionCounts?: {
    CONFUSED?: number;
    MORE?: number;
  };
  // Legacy format (keeping for compatibility)
  confusedCount?: number;
  moreCount?: number;
  timestamp?: number;
}

export function useWebSocket({
  sessionId,
  onConnect,
  onDisconnect,
  onError,
}: UseWebSocketOptions) {
  const clientRef = useRef<Client | null>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const setReactionsFromBackend = useReactionStore(
    (state) => state.setReactionsFromBackend
  );

  // Store callbacks in refs to avoid reconnection loops when callbacks change
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change (without triggering reconnection)
  useEffect(() => {
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onErrorRef.current = onError;
  }, [onConnect, onDisconnect, onError]);

  const connect = useCallback(() => {
    if (clientRef.current?.active) {
      return;
    }

    // Clear any pending error timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }

    // SockJS endpoint - backend exposes /ws with SockJS support
    const sockJsUrl = WS_URL.replace('ws://', 'http://').replace('wss://', 'https://');
    console.log('[WebSocket] Connecting to:', sockJsUrl);

    const client = new Client({
      webSocketFactory: () => new SockJS(sockJsUrl),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        console.log('[WebSocket] Connected');
        // Clear any pending error timeout since we connected successfully
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
          errorTimeoutRef.current = null;
        }
        setIsConnected(true);
        setConnectionError(null);
        onConnectRef.current?.();

        // Subscribe to reaction updates for this session
        const topic = getReactionTopic(sessionId);
        client.subscribe(topic, (message: IMessage) => {
          try {
            const data: ReactionMessage = JSON.parse(message.body);
            console.log('[WebSocket] Reaction update:', data);

            // Handle both backend format (reactionCounts map) and legacy format
            const confused = data.reactionCounts?.CONFUSED ?? data.confusedCount ?? 0;
            const more = data.reactionCounts?.MORE ?? data.moreCount ?? 0;

            setReactionsFromBackend(confused, more);
          } catch (err) {
            console.error('[WebSocket] Failed to parse message:', err);
          }
        });
      },

      onDisconnect: () => {
        console.log('[WebSocket] Disconnected');
        setIsConnected(false);
        onDisconnectRef.current?.();
      },

      onStompError: (frame) => {
        console.error('[WebSocket] STOMP error:', frame.headers.message);
        setConnectionError(frame.headers.message || 'Connection error');
        onErrorRef.current?.(new Error(frame.headers.message));
      },

      onWebSocketError: (event) => {
        console.error('[WebSocket] WebSocket error:', event);
        // Use a delayed error to allow SockJS to try fallback transports
        // Only show error if connection doesn't succeed within 10 seconds
        if (!errorTimeoutRef.current && !clientRef.current?.connected) {
          errorTimeoutRef.current = setTimeout(() => {
            if (!clientRef.current?.connected) {
              setConnectionError('WebSocket connection failed');
              onErrorRef.current?.(new Error('WebSocket connection failed'));
            }
            errorTimeoutRef.current = null;
          }, 10000); // 10 second grace period for connection attempts
        }
      },
    });

    client.activate();
    clientRef.current = client;
  }, [sessionId, setReactionsFromBackend]);

  const disconnect = useCallback(() => {
    // Clear any pending error timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionError,
    reconnect: connect,
  };
}

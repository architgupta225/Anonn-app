import { useEffect, useRef, useCallback } from 'react';
import { useToast } from './use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export const useWebSocket = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Connect to the server port (3000) with /ws path
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:3000/ws`;

    console.log('🔌 Connecting to WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected successfully');
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', message);

        switch (message.type) {
          case 'connected':
            console.log('✅ WebSocket connection confirmed');
            break;
          
          case 'notification':
            // Handle new notification
            console.log('🔔 Notification received:', message.notification);
            if (message.notification) {
              toast({
                title: "New notification",
                description: message.notification.content,
              });
              
              // Invalidate notifications query to refresh the list
              queryClient.invalidateQueries({ queryKey: ['notifications'] });
            }
            break;
          
          case 'feed_update':
            // Handle feed updates (new posts, comments, etc.)
            console.log('🔄 Feed update received:', message.action);
            if (message.action === 'comment') {
              // Invalidate posts query to refresh comment counts
              queryClient.invalidateQueries({ queryKey: ['posts'] });
              queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
            }
            break;
          
          case 'pong':
            // Handle ping response
            console.log('🏓 Pong received');
            break;
          
          default:
            console.log('❓ Unknown WebSocket message type:', message.type);
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      
      // Attempt to reconnect if not a normal closure
      if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttempts.current + 1})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [queryClient, toast]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  // Keep connection alive with periodic pings
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'ping' });
      }
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, [sendMessage]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    sendMessage,
    connect,
    disconnect,
  };
};

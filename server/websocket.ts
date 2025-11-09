import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { log } from './vite';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  constructor(server: Server) {
    try {
      log('Initializing WebSocket server...');
      this.wss = new WebSocketServer({ 
        server,
        // Add error handling to prevent crashes
        clientTracking: true,
        // Add perMessageDeflate for better compatibility
        perMessageDeflate: false,
        // Add path filtering to avoid Vite connections
        path: '/ws',
        // Add better error handling
        handleProtocols: () => 'websocket',
        // Add max payload size
        maxPayload: 1024 * 1024, // 1MB
      });
      this.setupWebSocket();
      log('WebSocket server initialized successfully');
    } catch (error) {
      log('Failed to initialize WebSocket server:', error instanceof Error ? error.message : String(error));
      log('Continuing without WebSocket support');
      this.wss = null;
    }
  }

  private setupWebSocket() {
    if (!this.wss) return;

    this.wss.on('connection', (ws: WebSocket, request: any) => {
      // Add origin check to filter out Vite connections
      const origin = request.headers.origin;
      const userAgent = request.headers['user-agent'] || '';
      
      // Block Vite and development tool connections
      if (origin && (origin.includes('vite') || origin.includes('localhost:5173'))) {
        log('Blocking Vite WebSocket connection to prevent conflicts');
        ws.close(1008, 'Vite connections not allowed');
        return;
      }
      
      // Block connections with Vite user agents
      if (userAgent.includes('vite') || userAgent.includes('webpack')) {
        log('Blocking development tool WebSocket connection');
        ws.close(1008, 'Development tool connections not allowed');
        return;
      }

      // Validate WebSocket connection
      if (ws.readyState !== WebSocket.CONNECTING && ws.readyState !== WebSocket.OPEN) {
        log('Invalid WebSocket state, closing connection');
        ws.close(1002, 'Invalid connection state');
        return;
      }

      log('WebSocket client connected');
      this.clients.add(ws);

      // Set up ping/pong to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.ping();
          } catch (error) {
            log('Error sending ping:', error instanceof Error ? error.message : String(error));
            clearInterval(pingInterval);
            this.clients.delete(ws);
          }
        } else {
          clearInterval(pingInterval);
          this.clients.delete(ws);
        }
      }, 30000); // Send ping every 30 seconds

      ws.on('message', (message: string) => {
        try {
          const data: WebSocketMessage = JSON.parse(message);
          log('WebSocket message received:', data.type);
          
          // Handle different message types if needed
          switch (data.type) {
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' }));
              break;
            default:
              log('Unknown WebSocket message type:', data.type);
          }
        } catch (error) {
          log('Error parsing WebSocket message:', error instanceof Error ? error.message : String(error));
          // Don't crash on invalid messages
        }
      });

      ws.on('close', () => {
        log('WebSocket client disconnected');
        clearInterval(pingInterval);
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        log('WebSocket error:', error instanceof Error ? error.message : String(error));
        clearInterval(pingInterval);
        this.clients.delete(ws);
        // Don't crash on WebSocket errors
      });

      // Send initial connection confirmation
      try {
        ws.send(JSON.stringify({ 
          type: 'connected', 
          message: 'WebSocket connection established' 
        }));
      } catch (error) {
        log('Error sending initial message:', error instanceof Error ? error.message : String(error));
        // Don't crash on send errors
      }
    });

    // Add error handling for the WebSocket server itself
    this.wss.on('error', (error) => {
      log('WebSocket server error:', error instanceof Error ? error.message : String(error));
      // Don't crash the main server on WebSocket errors
    });

    log('WebSocket server initialized');
  }

  public broadcast(message: WebSocketMessage) {
    if (!this.wss) return;
    
    const messageStr = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          log('Error sending WebSocket message:', error instanceof Error ? error.message : String(error));
          this.clients.delete(client);
        }
      }
    });
  }

  public getWss() {
    return this.wss;
  }

  public getClientCount() {
    return this.clients.size;
  }
}

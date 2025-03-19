import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { User } from '@shared/schema';

class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<number, WebSocket>;

  constructor(server: Server) {
    console.log('Creating WebSocket server with dedicated /ws path...');
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws' // Dedicated path to avoid conflicts with Vite
    });
    this.clients = new Map();

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket connection established on /ws path');

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'auth' && data.userId) {
            console.log(`Client authenticated with user ID: ${data.userId}`);
            this.clients.set(data.userId, ws);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
        // Remove client on disconnect
        Array.from(this.clients.entries()).forEach(([userId, client]) => {
          if (client === ws) {
            console.log(`Removing client for user ID: ${userId}`);
            this.clients.delete(userId);
          }
        });
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }

  sendNotification(userId: number, notification: any) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      try {
        console.log(`Sending notification to user ${userId}:`, notification);
        client.send(JSON.stringify({
          ...notification,
          timestamp: notification.timestamp || new Date().toISOString()
        }));
      } catch (error) {
        console.error(`Error sending notification to user ${userId}:`, error);
      }
    } else {
      console.log(`Client not found or not ready for user ${userId}`);
    }
  }

  broadcastNotification(notification: any) {
    console.log('Broadcasting notification to all clients:', notification);
    // Convert Map values to array before iteration
    Array.from(this.clients.values()).forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify({
            ...notification,
            timestamp: notification.timestamp || new Date().toISOString()
          }));
        } catch (error) {
          console.error('Error broadcasting notification:', error);
        }
      }
    });
  }
}

let wsService: WebSocketService;

export function initializeWebSocket(server: Server) {
  console.log('Initializing WebSocket service...');
  wsService = new WebSocketService(server);
  return wsService;
}

export function getWebSocketService() {
  if (!wsService) {
    throw new Error('WebSocket service not initialized');
  }
  return wsService;
}
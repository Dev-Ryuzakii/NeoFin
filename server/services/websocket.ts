import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { User } from '@shared/schema';

class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<number, WebSocket>;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.clients = new Map();

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket connection established');

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
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
        for (const [userId, client] of Array.from(this.clients.entries())) {
          if (client === ws) {
            console.log(`Removing client for user ID: ${userId}`);
            this.clients.delete(userId);
            break;
          }
        }
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
        client.send(JSON.stringify(notification));
      } catch (error) {
        console.error(`Error sending notification to user ${userId}:`, error);
      }
    } else {
      console.log(`Client not found or not ready for user ${userId}`);
    }
  }

  broadcastNotification(notification: any) {
    console.log('Broadcasting notification to all clients:', notification);
    for (const client of this.clients.values()) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(notification));
        } catch (error) {
          console.error('Error broadcasting notification:', error);
        }
      }
    }
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
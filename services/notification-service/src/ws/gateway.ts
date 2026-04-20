/**
 * WebSocket Gateway — Redis pub/sub fan-out.
 *
 * Clients subscribe to channels:
 *   heatmap:{venueId}
 *   alerts:{attendeeId}
 *   emergency:{venueId}
 *
 * Horizontal scaling: any gateway node can publish to any connected client
 * via Redis pub/sub. Connection state stored in Redis with TTL.
 */
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

export interface GatewayClient {
  id: string;
  ws: WebSocket;
  channels: Set<string>;
}

export class WebSocketGateway {
  private readonly wss: WebSocketServer;
  private readonly clients = new Map<string, GatewayClient>();
  private readonly subscriber: Redis;
  private readonly publisher: Redis;

  constructor(port: number, redisUrl: string) {
    this.wss = new WebSocketServer({ port });
    this.subscriber = new Redis(redisUrl);
    this.publisher = new Redis(redisUrl);
    this._setupWebSocket();
    this._setupRedisSubscriber();
  }

  private _setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const clientId = uuidv4();
      const url = new URL(req.url ?? '/', `http://localhost`);
      const channels = url.searchParams.getAll('channel');

      const client: GatewayClient = { id: clientId, ws, channels: new Set(channels) };
      this.clients.set(clientId, client);

      // Subscribe to requested Redis channels
      if (channels.length > 0) {
        this.subscriber.subscribe(...channels).catch(console.error);
      }

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'subscribe' && msg.channel) {
            client.channels.add(msg.channel);
            this.subscriber.subscribe(msg.channel).catch(console.error);
          }
        } catch {
          // ignore malformed messages
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
      });

      ws.send(JSON.stringify({ type: 'connected', clientId }));
    });
  }

  private _setupRedisSubscriber(): void {
    this.subscriber.on('message', (channel: string, message: string) => {
      for (const client of this.clients.values()) {
        if (client.channels.has(channel) && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({ channel, data: JSON.parse(message) }));
        }
      }
    });
  }

  /** Publish a message to a Redis channel (fan-out to all subscribed WS clients). */
  async publish(channel: string, message: unknown): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  get connectedCount(): number {
    return this.clients.size;
  }

  close(): void {
    this.wss.close();
    this.subscriber.disconnect();
    this.publisher.disconnect();
  }
}

import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationsService } from './conversations.service';

const origins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: origins.length ? origins : false, credentials: true },
  maxHttpBufferSize: 64 * 1024,
})
export class ConversationsGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly conversations: ConversationsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = String(client.handshake.auth?.token || '');
      if (!token || token.length > 4096) throw new Error('AUTH_INVALID');
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      if (!UUID_RE.test(String(payload.sub || ''))) throw new Error('AUTH_INVALID');

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, status: true },
      });
      if (!user || user.status !== 'ACTIVE') throw new Error('AUTH_INVALID');
      client.data.userId = user.id;
    } catch {
      client.disconnect(true);
    }
  }

  private conversationId(value: unknown) {
    const id = String(value || '').trim();
    return UUID_RE.test(id) ? id : null;
  }

  private errorMessage(error: unknown) {
    if (error && typeof error === 'object' && 'getResponse' in error && typeof (error as any).getResponse === 'function') {
      const response = (error as any).getResponse();
      if (typeof response === 'string') return response;
      if (response && typeof response.message === 'string') return response.message;
    }
    return 'REALTIME_REQUEST_FAILED';
  }

  @SubscribeMessage('join_conversation')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId?: unknown },
  ) {
    const conversationId = this.conversationId(body?.conversationId);
    if (!conversationId) return { ok: false, message: 'CONVERSATION_ID_INVALID' };

    try {
      await this.conversations.get(client.data.userId, conversationId);
      await client.join(`conversation:${conversationId}`);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: this.errorMessage(error) };
    }
  }

  @SubscribeMessage('send_message')
  async send(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId?: unknown; body?: unknown },
  ) {
    const conversationId = this.conversationId(body?.conversationId);
    const text = typeof body?.body === 'string' ? body.body.trim() : '';
    if (!conversationId) return { ok: false, message: 'CONVERSATION_ID_INVALID' };
    if (!text || text.length > 3000) return { ok: false, message: 'MESSAGE_INVALID' };

    try {
      const message = await this.conversations.send(client.data.userId, conversationId, text);
      this.server.to(`conversation:${conversationId}`).emit('message:new', message);
      return { ok: true, id: message.id };
    } catch (error) {
      return { ok: false, message: this.errorMessage(error) };
    }
  }
}

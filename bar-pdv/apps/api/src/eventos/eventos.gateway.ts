import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import type { JwtPayload } from '@bar/shared';

/** Cada estabelecimento tem sua "sala": só recebe eventos do próprio bar. */
@WebSocketGateway({ cors: { origin: '*' } })
export class EventosGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(private jwt: JwtService) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string;
      const payload = this.jwt.verify<JwtPayload>(token);
      client.join(`est:${payload.estabelecimentoId}`);
    } catch {
      client.disconnect(true);
    }
  }

  emitir(estabelecimentoId: string, evento: string, payload: unknown = {}) {
    this.server.to(`est:${estabelecimentoId}`).emit(evento, payload);
  }
}

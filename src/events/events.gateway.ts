import * as nestjs from '@nestjs/common';
import * as ws from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { httpAnswer } from '../globalImport';
import { SessionServiceSingleton } from '../session/session.service';
import { UtilsServiceSingleton } from '../utils/utils.service';

@ws.WebSocketGateway({ cors: { origin: '*' } })
@nestjs.Injectable({ scope: nestjs.Scope.DEFAULT })
export class EventsGateway {
  constructor(private sessionService: SessionServiceSingleton, private utils: UtilsServiceSingleton) {}
  @ws.WebSocketServer() server: Server;

  async handleDisconnect(socket: Socket) {}

  async handleConnection(socket: Socket) {
    return httpAnswer.OK;
  }

  async wsExceptionCatcher(fn) {
    try {
      const result = await fn();
      return { ...httpAnswer.OK, data: result };
    } catch (err) {
      return { ...httpAnswer.ERR, msg: err.message };
    }
  }

  @ws.SubscribeMessage('linkSession')
  async handleLinkSession(@ws.ConnectedSocket() client: Socket) {
    return this.wsExceptionCatcher(async () => {
      const cookie = client.handshake.headers.cookie;
      if (!cookie) throw new nestjs.BadRequestException('HTTP session not found (send http-request first)');

      const parsedCookie = this.utils.parseCookies(cookie);
      const decodedCookie = await this.utils.decodedSecureString(parsedCookie.session);
      const sessionId = decodedCookie.id;
      const sessionIsAlive = await this.sessionService.get(sessionId);
      if (!sessionIsAlive) throw new nestjs.BadRequestException('Unknown session');

      await this.sessionService.update(sessionId, { eventsId: client.id });
    });
  }

  @ws.SubscribeMessage('call')
  async handleMessage(
    @ws.MessageBody() data: { controller: string; method: string; data: any },
    @ws.ConnectedSocket() client: Socket,
  ) {
    return this.wsExceptionCatcher(async () => {
      if (this[data.controller] && this[data.controller][data.method]) {
        return await this[data.controller][data.method](data);
      }
      return data;
    });
  }
}

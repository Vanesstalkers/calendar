import * as nestjs from '@nestjs/common';
import * as ws from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LoggerServiceSingleton } from 'src/logger/logger.service';
import { UserService, UserServiceSingleton } from 'src/user/user.service';
import { httpAnswer } from '../globalImport';
import { SessionServiceSingleton } from '../session/session.service';
import { UtilsServiceSingleton } from '../utils/utils.service';

@ws.WebSocketGateway({ cors: { origin: '*' } })
@nestjs.Injectable({ scope: nestjs.Scope.DEFAULT })
export class EventsGateway {
  eventsMap = {};
  sessionsMap = {};
  constructor(
    @nestjs.Inject(nestjs.forwardRef(() => SessionServiceSingleton)) private sessionService: SessionServiceSingleton,
    @nestjs.Inject(nestjs.forwardRef(() => UtilsServiceSingleton)) private utils: UtilsServiceSingleton,
    private user: UserServiceSingleton,
    private logger: LoggerServiceSingleton,
  ) {}
  @ws.WebSocketServer() server: Server;

  async handleDisconnect(client: Socket) {
    const sessionId = this.eventsMap[client.id];
    delete this.eventsMap[client.id];
    delete this.sessionsMap[sessionId];
  }

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

      this.eventsMap[client.id] = sessionId;
      this.sessionsMap[sessionId] = client.id;

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
        await this.logger.startLog({ ...client.request, ...client.handshake, protocol: 'ws' }, 'WS');
        const sessionId = this.eventsMap[client.id];
        const sessionData = await this.sessionService.get(sessionId);
        await this.logger.sendLog([{ sessionData, requestData: data }]);

        const result = await this[data.controller][data.method](data.data);

        await this.logger.sendLog({ answerData: result }, { client, finalizeType: 'ok' });
        return result;
      }
      return data;
    });
  }
}

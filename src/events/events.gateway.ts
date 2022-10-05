import * as nestjs from '@nestjs/common';
import * as ws from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { AppServiceSingleton } from '../app.service';
import { SessionServiceSingleton } from '../session/session.service';

@ws.WebSocketGateway({ cors: { origin: '*' } })
@nestjs.Injectable({ scope: nestjs.Scope.DEFAULT })
export class EventsGateway {
  constructor(private appService: AppServiceSingleton, private sessionService: SessionServiceSingleton) {}
  @ws.WebSocketServer() server: Server;

  async handleDisconnect(socket: Socket) {}

  async handleConnection(socket: Socket) {
    return { status: 'ok' };
  }

  @ws.SubscribeMessage('linkSession')
  async handleLinkSession(@ws.MessageBody() data: string, @ws.ConnectedSocket() client: Socket) {
    const storageId: string = await this.appService.getFromCache(data);
    await this.appService.deleteFromCache(data);
    await this.sessionService.updateStorageById(storageId, { eventsId: client.id });
  }

  @ws.SubscribeMessage('message')
  async handleMessage(
    @ws.MessageBody() data: { controller: string; method: string; requestData: any },
    @ws.ConnectedSocket() client: Socket,
  ) {
    // if (this[data.controller] && this[data.controller][data.method]) {
    //   try {
    //     return await this[data.controller][data.method](data.requestData);
    //   } catch (err) {
    //     return { status: 'error', err };
    //   }
    // }
    return data;
  }
}

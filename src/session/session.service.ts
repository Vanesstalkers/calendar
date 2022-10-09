import * as crypto from 'crypto';
import * as nestjs from '@nestjs/common';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, types } from '../globalImport';

import { AppServiceSingleton } from '../app.service';
import { UserService, UserServiceSingleton } from '../user/user.service';
import { UtilsService, UtilsServiceSingleton } from '../utils/utils.service';

@nestjs.Injectable({ scope: nestjs.Scope.DEFAULT })
export class SessionServiceSingleton {
  constructor(
    public appService: AppServiceSingleton,
    public userService: UserServiceSingleton,
    public utils: UtilsServiceSingleton,
  ) {}

  async getState(sessionId: string) {
    const sessionData = (await this.get(sessionId)) ?? {};
    return {
      userId: sessionData.userId ?? null,
      phone: sessionData.phone ?? null,
      registration: sessionData.registration === true,
      login: sessionData.login === true,
      personalProjectId: sessionData.personalProjectId ?? null,
      currentProjectId: sessionData.currentProjectId ?? null,
      eventsId: sessionData.eventsId ?? null,
    };
  }

  async create(sessionId?: string) {
    if (!sessionId) sessionId = crypto.randomUUID();
    await this.appService.addToCache(sessionId, JSON.stringify({ createTime: new Date() }), { ttl: 60 * 5 });
    return sessionId;
  }

  async isLoggedIn(session: FastifySession) {
    if (!session.id) return false;
    const sessionData = await this.get(session.id);
    return session.userId && sessionData && sessionData.login === true ? true : false;
  }

  async get(sessionId: string) {
    return await this.appService.getJsonFromCache(sessionId);
  }

  async update(sessionId: string, data: types['session']['storage']) {
    try {
      const sessionData = await this.appService.getJsonFromCache(sessionId);
      const ttl = 60 * 60 * 24; // при каждом обновлении продлеаем сессию
      await this.appService.addToCache(sessionId, JSON.stringify({ ...sessionData, ...data }), { ttl });
    } catch (err) {
      console.log('ERROR sessionService.update', { sessionId, data });
    }
  }
}

@nestjs.Injectable({ scope: nestjs.Scope.REQUEST })
export class SessionService extends SessionServiceSingleton {
  constructor(public appService: AppServiceSingleton, public userService: UserService, public utils: UtilsService) {
    super(appService, userService, utils);
  }
}

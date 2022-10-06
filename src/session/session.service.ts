import * as nestjs from '@nestjs/common';
import { Session as FastifySession } from '@fastify/secure-session';
import { AppServiceSingleton } from '../app.service';
import { UserService, UserServiceSingleton } from '../user/user.service';
import { decorators, interfaces, types } from '../globalImport';
import * as crypto from 'crypto';

@nestjs.Injectable({ scope: nestjs.Scope.DEFAULT })
export class SessionServiceSingleton {
  constructor(public appService: AppServiceSingleton, public userService: UserServiceSingleton) {}

  async getState(session: FastifySession) {
    const storage = (await this.getStorage(session)) ?? {};
    return {
      userId: storage.userId ?? null,
      registration: storage.registration === true,
      login: storage.login === true,
      personalProjectId: storage.personalProjectId ?? null,
      currentProjectId: storage.currentProjectId ?? null,
      eventsId: storage.eventsId ?? null,
    };
  }

  async validateSession(session: FastifySession) {
    if (!session.storageId) {
      this.createStorage(session);
    } else if (!(await this.appService.getFromCache(session.storageId))) {
      // если пропали данные из redis-а
      this.createStorage(session);
    }
  }

  async createStorage(session: FastifySession) {
    const storageId = crypto.randomUUID();
    session.storageId = storageId;
    await this.appService.addToCache(storageId, '{}', { ttl: 0 });
    if (session.userId) await this.userService.update(session.userId, { config: { sessionStorageId: storageId } });
  }

  async isLoggedIn(session: FastifySession) {
    const storage = await this.getStorage(session);
    return session.userId && storage && storage.login === true;
  }

  async getStorage(session: FastifySession) {
    return JSON.parse(await this.appService.getFromCache(session.storageId));
  }

  async updateStorage(session: FastifySession, data: types['session']['storage']) {
    await this.updateStorageById(session.storageId, data);
  }

  async updateStorageById(storageId: string, data: types['session']['storage']) {
    try {
      const storageData = JSON.parse(await this.appService.getFromCache(storageId));
      await this.appService.addToCache(storageId, JSON.stringify({ ...storageData, ...data }), { ttl: 0 });
    } catch (err) {
      console.log('updateStorageById err', { storageId, data });
    }
  }

  async getUserId(session: FastifySession) {
    const storage = await this.getStorage(session);
    return storage.userId;
  }

  async createWsLink(session: FastifySession) {
    const wsLink = Math.random().toString();
    await this.appService.addToCache(wsLink, session.storageId, { ttl: 0 });
    return wsLink;
  }
}

@nestjs.Injectable({ scope: nestjs.Scope.REQUEST })
export class SessionService extends SessionServiceSingleton {
  constructor(public appService: AppServiceSingleton, public userService: UserService) {
    super(appService, userService);
  }
}
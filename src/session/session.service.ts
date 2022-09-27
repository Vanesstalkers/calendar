import * as nestjs from '@nestjs/common';
import { Session as FastifySession } from '@fastify/secure-session';
import { UserService } from '../user/user.service';
import { decorators, interfaces, types } from '../globalImport';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';

@nestjs.Injectable()
export class SessionService {
  constructor(public userService: UserService, @nestjs.Inject(nestjs.CACHE_MANAGER) private cacheManager: Cache) {}

  async getState(session: FastifySession) {
    const storage = (await this.getStorage(session)) ?? {};
    return {
      userId: storage.userId ?? null,
      registration: storage.registration === true,
      login: storage.login === true,
      personalProjectId: storage.personalProjectId ?? null,
      currentProjectId: storage.currentProjectId ?? null,
    };
  }

  async validateSession(session: FastifySession) {
    if (!session.storageId) {
      this.createStorage(session);
    } else if (!(await this.cacheManager.get(session.storageId))) {
      // если пропали данные из redis-а
      this.createStorage(session);
    }
  }

  async createStorage(session: FastifySession) {
    const storageId = crypto.randomUUID();
    session.storageId = storageId;
    await this.cacheManager.set(storageId, '{}', { ttl: 0 });
    if (session.userId) await this.userService.update(session.userId, { config: { sessionStorageId: storageId } });
  }

  async isLoggedIn(session: FastifySession) {
    const storage = await this.getStorage(session);
    return session.userId && storage && storage.login === true;
  }

  async getStorage(session: FastifySession) {
    return JSON.parse(await this.cacheManager.get(session.storageId));
  }

  async updateStorage(session: FastifySession, data: types['session']['storage']) {
    await this.updateStorageById(session.storageId, data);
  }

  async updateStorageById(storageId: string, data: types['session']['storage']) {
    try {
      const storageData = JSON.parse(await this.cacheManager.get(storageId));
      await this.cacheManager.set(storageId, JSON.stringify({ ...storageData, ...data }), { ttl: 0 });
    } catch (err) {
      console.log('updateStorageById err', { storageId, data });
    }
  }

  async getUserId(session: FastifySession) {
    const storage = await this.getStorage(session);
    return storage.userId;
  }
}

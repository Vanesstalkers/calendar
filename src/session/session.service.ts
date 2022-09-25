import * as nestjs from '@nestjs/common';

import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, types } from '../globalImport';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';

@nestjs.Injectable()
export class SessionService {
  constructor(@nestjs.Inject(nestjs.CACHE_MANAGER) private cacheManager: Cache) {}

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

  /**
   * Проверка сессии на наличие связанного cache-хранилища (создает его при отсутствии).
   * @param {FastifySession} session - сессия пользователя
   */
  async validateSession(session: FastifySession) {
    if (!session.get('storageId')) {
      const storageId = crypto.randomUUID();
      session.set('storageId', storageId);
      await this.cacheManager.set(storageId, '{}', { ttl: 0 });
    }
  }

  async isLoggedIn(session: FastifySession) {
    const storage = await this.getStorage(session);
    return storage.login === true;
  }

  async getStorage(session: FastifySession) {
    await this.validateSession(session);
    const storageId = session.get('storageId');
    return JSON.parse(await this.cacheManager.get(storageId));
  }

  async updateStorage(session: FastifySession, data: types['session']['storage']) {
    await this.validateSession(session);
    const storageId = session.get('storageId');
    await this.updateStorageById(storageId, data);
  }

  async updateStorageById(storageId: string, data: types['session']['storage']) {
    const storageData = JSON.parse(await this.cacheManager.get(storageId));
    await this.cacheManager.set(storageId, JSON.stringify({ ...storageData, ...data }), { ttl: 0 });
  }

  async getUserId(session: FastifySession): Promise<number> {
    const storage = await this.getStorage(session);
    return storage.userId;
  }
}

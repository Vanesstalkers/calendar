import { Session as FastifySession } from '@fastify/secure-session';
import { Inject, Injectable, CACHE_MANAGER } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { SessionI } from './session.interface';
import { SessionStorageI } from './storage.interface';

import * as crypto from 'crypto';

@Injectable()
export class SessionService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}
  getState(session: FastifySession): SessionI {
    return {
      registration: session.registration || false,
      login: session.login || false,
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
  async getStorage(session: FastifySession): Promise<SessionStorageI> {
    await this.validateSession(session);
    const storageId = session.get('storageId');
    return JSON.parse(await this.cacheManager.get(storageId));
  }
  async updateStorage(session: FastifySession, data: SessionStorageI) {
    await this.validateSession(session);
    const storageId = session.get('storageId');
    const storageData: SessionStorageI = JSON.parse(await this.cacheManager.get(storageId));
    await this.cacheManager.set(
      storageId,
      JSON.stringify({ ...storageData, ...data }),
      { ttl: 0 },
    );
  }
}

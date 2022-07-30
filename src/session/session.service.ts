import { Session as FastifySession } from '@fastify/secure-session';
import { Inject, Injectable, CACHE_MANAGER } from '@nestjs/common';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';

import { SessionI } from './session.interface';
import { SessionStorageI } from './storage.interface';

@Injectable()
export class SessionService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}
  
  async getState(session: FastifySession): Promise<SessionStorageI> { 
    const storage = await this.getStorage(session) ?? {};
    return {
      userId: storage.userId ?? null,
      registration: storage.registration === true,
      login: storage.login === true,
      currentProject: storage.currentProject ?? null,
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

  async isLoggedIn(session: FastifySession){
    const storage = await this.getStorage(session);
    return storage.login === true;
  }

  async getStorage(session: FastifySession): Promise<SessionStorageI> {
    await this.validateSession(session);
    const storageId = session.get('storageId');
    return JSON.parse(await this.cacheManager.get(storageId));
  }

  async updateStorage(session: FastifySession, data: SessionStorageI) {
    await this.validateSession(session);
    const storageId = session.get('storageId');
    await this.updateStorageById(storageId, data);
  }

  async updateStorageById(storageId: string, data: SessionStorageI) {
    const storageData: SessionStorageI = JSON.parse(await this.cacheManager.get(storageId));
    await this.cacheManager.set(
      storageId,
      JSON.stringify({ ...storageData, ...data }),
      { ttl: 0 },
    );
  }

  async getUserId(session: FastifySession): Promise<number> {
    const storage = await this.getStorage(session);
    return storage.userId;
  }

}

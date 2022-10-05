import * as nestjs from '@nestjs/common';
import { Cache, CachingConfig } from 'cache-manager';

@nestjs.Injectable({ scope: nestjs.Scope.DEFAULT })
export class AppServiceSingleton {
  constructor(@nestjs.Inject(nestjs.CACHE_MANAGER) private cacheManager: Cache) {}
  async addToCache(key: string, item: string, options: CachingConfig) {
    await this.cacheManager.set(key, item, options);
  }
  async getFromCache(key: string) {
    const value: string = await this.cacheManager.get(key);
    return value;
  }
  async deleteFromCache(key: string) {
    await this.cacheManager.del(key);
  }
}

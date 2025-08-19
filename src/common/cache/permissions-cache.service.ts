import { Injectable, Inject } from '@nestjs/common';
import { Cache } from '@nestjs/cache-manager';

@Injectable()
export class PermissionsCacheService {
  constructor(@Inject(Cache) private readonly cacheManager: Cache) {}

  async get(userId: string): Promise<string[] | null> {
    return (await this.cacheManager.get<string[]>(`perms:${userId}`)) ?? null;
  }

  async set(userId: string, perms: string[], ttlMs = 60_000): Promise<void> {
    await this.cacheManager.set(`perms:${userId}`, perms, ttlMs);
  }

  async del(userId: string): Promise<void> {
    await this.cacheManager.del(`perms:${userId}`);
  }
}

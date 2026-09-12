import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;
  constructor() {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('REDIS_URL is required');
    this.client = new Redis(url, { maxRetriesPerRequest: 2, enableReadyCheck: true });
  }
  async hit(key: string, limit: number, windowSeconds: number) {
    const tx = this.client.multi();
    tx.incr(key); tx.expire(key, windowSeconds, 'NX');
    const result = await tx.exec();
    const count = Number(result?.[0]?.[1] || 0);
    return { allowed: count <= limit, count };
  }
  async onModuleDestroy() { await this.client.quit(); }
}

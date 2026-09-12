import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('health')
  health() {
    return { ok: true, service: 'chovot-api', time: new Date().toISOString() };
  }

  @Get('ready')
  async ready() {
    const [database, redis] = await Promise.allSettled([
      this.prisma.$queryRawUnsafe('SELECT 1'),
      this.redis.client.ping(),
    ]);

    const dependencies = {
      database: database.status === 'fulfilled',
      redis: redis.status === 'fulfilled',
    };

    if (!dependencies.database || !dependencies.redis) {
      throw new ServiceUnavailableException({
        ok: false,
        service: 'chovot-api',
        dependencies,
      });
    }

    return {
      ok: true,
      service: 'chovot-api',
      dependencies,
      time: new Date().toISOString(),
    };
  }
}

const { AppController } = require('../dist/app.controller');

describe('AppController health and readiness', () => {
  function createController({ dbOk = true, redisOk = true } = {}) {
    const prisma = {
      $queryRawUnsafe: jest.fn(() =>
        dbOk ? Promise.resolve([{ ok: 1 }]) : Promise.reject(new Error('db down')),
      ),
    };
    const redis = {
      client: {
        ping: jest.fn(() =>
          redisOk ? Promise.resolve('PONG') : Promise.reject(new Error('redis down')),
        ),
      },
    };
    return { controller: new AppController(prisma, redis), prisma, redis };
  }

  test('liveness does not depend on downstream services', () => {
    const { controller } = createController({ dbOk: false, redisOk: false });
    const result = controller.health();
    expect(result.ok).toBe(true);
    expect(result.service).toBe('chovot-api');
  });

  test('readiness is green only when PostgreSQL and Redis respond', async () => {
    const { controller, prisma, redis } = createController();
    const result = await controller.ready();

    expect(result.ok).toBe(true);
    expect(result.dependencies).toEqual({ database: true, redis: true });
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1');
    expect(redis.client.ping).toHaveBeenCalledTimes(1);
  });

  test.each([
    [{ dbOk: false, redisOk: true }, { database: false, redis: true }],
    [{ dbOk: true, redisOk: false }, { database: true, redis: false }],
    [{ dbOk: false, redisOk: false }, { database: false, redis: false }],
  ])('readiness returns 503 when a required dependency is unavailable', async (state, expected) => {
    const { controller } = createController(state);

    try {
      await controller.ready();
      throw new Error('ready() unexpectedly succeeded');
    } catch (error) {
      expect(error.getStatus()).toBe(503);
      expect(error.getResponse()).toMatchObject({
        ok: false,
        service: 'chovot-api',
        dependencies: expected,
      });
    }
  });
});

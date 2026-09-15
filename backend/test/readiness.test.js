const { AppController } = require('../dist/app.controller');

describe('AppController health and readiness', () => {
  function createController({ dbOk = true, redisOk = true, storageOk = true } = {}) {
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
    const storage = {
      readiness: jest.fn(() =>
        storageOk ? Promise.resolve(true) : Promise.reject(new Error('storage down')),
      ),
    };
    return { controller: new AppController(prisma, redis, storage), prisma, redis, storage };
  }

  test('liveness does not depend on downstream services', () => {
    const { controller } = createController({ dbOk: false, redisOk: false, storageOk: false });
    const result = controller.health();
    expect(result.ok).toBe(true);
    expect(result.service).toBe('chovot-api');
  });

  test('readiness is green only when PostgreSQL, Redis and object storage respond', async () => {
    const { controller, prisma, redis, storage } = createController();
    const result = await controller.ready();

    expect(result.ok).toBe(true);
    expect(result.dependencies).toEqual({ database: true, redis: true, storage: true });
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1');
    expect(redis.client.ping).toHaveBeenCalledTimes(1);
    expect(storage.readiness).toHaveBeenCalledTimes(1);
  });

  test.each([
    [{ dbOk: false, redisOk: true, storageOk: true }, { database: false, redis: true, storage: true }],
    [{ dbOk: true, redisOk: false, storageOk: true }, { database: true, redis: false, storage: true }],
    [{ dbOk: true, redisOk: true, storageOk: false }, { database: true, redis: true, storage: false }],
    [{ dbOk: false, redisOk: false, storageOk: false }, { database: false, redis: false, storage: false }],
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

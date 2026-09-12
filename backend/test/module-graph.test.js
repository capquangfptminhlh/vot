const { Test } = require('@nestjs/testing');
const { AppModule } = require('../dist/app.module');

jest.setTimeout(15000);

describe('Nest application dependency graph', () => {
  test('all feature modules and guards resolve at compile time', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });
});

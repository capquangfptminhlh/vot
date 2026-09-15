const { VerificationService } = require('../dist/verification/verification.service');

describe('seller verification security invariants', () => {
  test('normalize never clears an administrative suspension', async () => {
    const reviewedAt = new Date('2026-09-01T00:00:00.000Z');
    const update = jest.fn(async ({ data }) => ({ ...data }));
    const prisma = {
      sellerVerification: {
        findUnique: jest.fn(async () => ({
          userId: 'seller-1',
          phoneVerified: true,
          identityVerified: true,
          bankNameVerified: true,
          status: 'SUSPENDED',
          reviewedAt,
        })),
        update,
      },
    };

    const service = new VerificationService(prisma, {});
    await service.normalize('seller-1');

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].data.status).toBe('SUSPENDED');
    expect(update.mock.calls[0][0].data.reviewedAt).toBe(reviewedAt);
  });

  test('suspended seller cannot start another provider verification session', async () => {
    const service = new VerificationService({}, {});
    jest.spyOn(service, 'me').mockResolvedValue({
      phoneVerified: true,
      identityVerified: true,
      bankNameVerified: true,
      status: 'SUSPENDED',
    });

    try {
      await service.startProvider('seller-1', 'identity');
      throw new Error('Expected SELLER_SUSPENDED');
    } catch (error) {
      expect(error.getStatus()).toBe(403);
      expect(error.getResponse()).toMatchObject({ message: 'SELLER_SUSPENDED' });
    }
  });
});

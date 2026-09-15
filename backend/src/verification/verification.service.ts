import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { AuthService } from '../auth/auth.service';
import { OtpChannel } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  private async normalize(userId: string) {
    const verification = await this.prisma.sellerVerification.findUnique({ where: { userId } });
    if (!verification) return null;

    const fullyVerified = verification.phoneVerified
      && verification.identityVerified
      && verification.bankNameVerified;

    // Suspension is an administrative trust decision and must never be cleared
    // automatically just because all provider verification flags are true.
    const nextStatus = verification.status === 'SUSPENDED'
      ? 'SUSPENDED'
      : fullyVerified
        ? 'VERIFIED'
        : 'PENDING';

    const reviewedAt = nextStatus === 'VERIFIED' && verification.status !== 'VERIFIED'
      ? new Date()
      : verification.reviewedAt;

    return this.prisma.sellerVerification.update({
      where: { userId },
      data: { status: nextStatus, reviewedAt },
    });
  }

  async me(userId: string) {
    return this.prisma.sellerVerification.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: {
        phoneVerified: true,
        identityVerified: true,
        bankNameVerified: true,
        status: true,
        reviewedAt: true,
        updatedAt: true,
      },
    });
  }

  requestPhone(userId: string, phone: string, ip?: string) {
    return this.auth.requestOtp(OtpChannel.PHONE, phone, 'link_phone', userId, ip);
  }

  async verifyPhone(userId: string, phone: string, code: string, ip?: string) {
    const target = await this.auth.verifyOtp(
      OtpChannel.PHONE,
      phone,
      code,
      'link_phone',
      userId,
      ip,
    );

    const conflict = await this.prisma.user.findFirst({
      where: { phone: target, id: { not: userId } },
      select: { id: true },
    });
    if (conflict) throw new ForbiddenException('PHONE_ALREADY_USED');

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { phone: target } }),
      this.prisma.sellerVerification.upsert({
        where: { userId },
        create: { userId, phoneVerified: true },
        update: { phoneVerified: true },
      }),
      this.prisma.kycAuditEvent.create({
        data: { userId, event: 'phone_verified', provider: 'otp' },
      }),
    ]);

    return this.normalize(userId);
  }

  async startProvider(userId: string, kind: 'identity' | 'bank') {
    const verification = await this.me(userId);
    if (!verification.phoneVerified) throw new ForbiddenException('PHONE_VERIFICATION_REQUIRED');
    if (verification.status === 'SUSPENDED') throw new ForbiddenException('SELLER_SUSPENDED');

    const base = process.env.KYC_PROVIDER_BASE_URL;
    const key = process.env.KYC_PROVIDER_API_KEY;
    const callbackUrl = process.env.KYC_WEBHOOK_PUBLIC_URL;
    if (!base || !key || !callbackUrl) throw new ServiceUnavailableException('KYC_PROVIDER_NOT_CONFIGURED');

    const response = await fetch(`${base.replace(/\/$/, '')}/sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ subjectId: userId, kind, callbackUrl }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new ServiceUnavailableException('KYC_PROVIDER_FAILED');

    const data: any = await response.json();
    const reference = String(data.reference || data.id || '').slice(0, 255);
    const redirectUrl = String(data.url || '');
    try {
      const parsed = new URL(redirectUrl);
      if (parsed.protocol !== 'https:') throw new Error('not https');
    } catch {
      throw new ServiceUnavailableException('KYC_PROVIDER_INVALID_RESPONSE');
    }

    await this.prisma.kycAuditEvent.create({
      data: {
        userId,
        event: `${kind}_session_started`,
        provider: process.env.KYC_PROVIDER_NAME || 'external',
        providerRef: reference,
      },
    });

    return { url: redirectUrl, reference };
  }

  private validWebhookSecret(received: string | undefined) {
    const expected = process.env.KYC_WEBHOOK_SECRET;
    if (!expected || !received) return false;
    const a = createHash('sha256').update(expected).digest();
    const b = createHash('sha256').update(received).digest();
    return timingSafeEqual(a, b);
  }

  async webhook(kind: 'identity' | 'bank', secret: string | undefined, body: any) {
    if (!this.validWebhookSecret(secret)) throw new UnauthorizedException('WEBHOOK_SIGNATURE_INVALID');

    const userId = String(body?.subjectId || '');
    const verified = body?.status === 'verified' || body?.verified === true;
    const reference = String(body?.reference || body?.id || '').slice(0, 255);
    if (!userId) throw new BadRequestException('WEBHOOK_INVALID');

    const userExists = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!userExists) throw new BadRequestException('WEBHOOK_SUBJECT_UNKNOWN');

    const current = await this.prisma.sellerVerification.findUnique({ where: { userId } });
    const create = kind === 'identity'
      ? { userId, identityVerified: verified, identityProviderRef: reference }
      : { userId, bankNameVerified: verified, bankProviderRef: reference };
    const update = kind === 'identity'
      ? { identityVerified: verified, identityProviderRef: reference }
      : { bankNameVerified: verified, bankProviderRef: reference };

    await this.prisma.$transaction([
      this.prisma.sellerVerification.upsert({ where: { userId }, create, update }),
      this.prisma.kycAuditEvent.create({
        data: {
          userId,
          event: `${kind}_${verified ? 'verified' : 'rejected'}`,
          provider: process.env.KYC_PROVIDER_NAME || 'external',
          providerRef: reference,
        },
      }),
    ]);

    // normalize() preserves SUSPENDED even when a provider later sends a
    // successful verification callback.
    if (current?.status === 'SUSPENDED') return { ok: true, suspended: true };
    await this.normalize(userId);
    return { ok: true };
  }
}

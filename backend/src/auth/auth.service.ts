import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { OtpChannel, UserRole } from '../generated/prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
  ) {}

  normalize(channel: OtpChannel, raw: string) {
    const value = String(raw || '').trim();
    if (channel === 'EMAIL') {
      const email = value.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('EMAIL_INVALID');
      return email;
    }
    const phone = value.replace(/[\s()-]/g, '');
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new BadRequestException('PHONE_INVALID');
    return phone;
  }

  private digest(value: string, pepperName: 'OTP_PEPPER' | 'REFRESH_TOKEN_PEPPER' | 'IP_HASH_PEPPER') {
    const pepper = process.env[pepperName];
    if (!pepper || pepper.length < 24) throw new Error(`${pepperName} must be at least 24 characters`);
    return createHash('sha256').update(`${pepper}:${value}`).digest('hex');
  }

  private async guardOtpIp(ip: string | undefined, action: 'request' | 'verify') {
    if (!ip) return;
    const ipHash = this.digest(ip, 'IP_HASH_PEPPER');
    const limit = action === 'request' ? 20 : 60;
    const gate = await this.redis.hit(`otp:${action}:ip:${ipHash}`, limit, 600);
    if (!gate.allowed) throw new BadRequestException('OTP_RATE_LIMIT');
  }

  async requestOtp(
    channel: OtpChannel,
    rawTarget: string,
    purpose = 'login',
    userId?: string,
    ip?: string,
  ) {
    await this.guardOtpIp(ip, 'request');

    const target = this.normalize(channel, rawTarget);
    const targetHash = this.digest(target, 'OTP_PEPPER');
    const gate = await this.redis.hit(`otp:req:${purpose}:${targetHash}`, 5, 600);
    if (!gate.allowed) throw new BadRequestException('OTP_RATE_LIMIT');

    const devCode = process.env.NODE_ENV !== 'production' ? process.env.OTP_DEV_CODE : undefined;
    const code = devCode || String(randomInt(100000, 999999));
    const codeHash = await argon2.hash(code, { type: argon2.argon2id });

    const challenge = await this.prisma.otpChallenge.create({
      data: {
        userId,
        channel,
        targetHash,
        codeHash,
        purpose,
        expiresAt: new Date(Date.now() + 5 * 60_000),
      },
    });

    try {
      await this.deliverOtp(channel, target, code);
    } catch (error) {
      // A delivery failure must not leave a valid OTP challenge behind.
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      }).catch(() => undefined);
      throw error;
    }

    return { ok: true, expiresInSeconds: 300 };
  }

  private async deliverOtp(channel: OtpChannel, target: string, code: string) {
    const url = process.env.OTP_DELIVERY_WEBHOOK_URL;
    if (!url) {
      if (process.env.NODE_ENV !== 'production' && process.env.OTP_DEV_CODE) return;
      throw new ServiceUnavailableException('OTP_PROVIDER_NOT_CONFIGURED');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.OTP_DELIVERY_WEBHOOK_SECRET || ''}`,
      },
      body: JSON.stringify({ channel, target, code, template: 'chovot_login' }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new ServiceUnavailableException('OTP_DELIVERY_FAILED');
  }

  async verifyOtp(
    channel: OtpChannel,
    rawTarget: string,
    code: string,
    purpose = 'login',
    userId?: string,
    ip?: string,
  ) {
    await this.guardOtpIp(ip, 'verify');

    const target = this.normalize(channel, rawTarget);
    const targetHash = this.digest(target, 'OTP_PEPPER');
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: {
        targetHash,
        channel,
        purpose,
        userId: userId || null,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge || challenge.attempts >= 5) throw new UnauthorizedException('OTP_INVALID');

    const valid = await argon2.verify(challenge.codeHash, String(code || ''));
    if (!valid) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('OTP_INVALID');
    }

    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
    return target;
  }

  async loginWithOtp(
    channel: OtpChannel,
    rawTarget: string,
    code: string,
    meta: { userAgent?: string; ip?: string },
  ) {
    const target = await this.verifyOtp(channel, rawTarget, code, 'login', undefined, meta.ip);
    let user = channel === 'EMAIL'
      ? await this.prisma.user.findUnique({ where: { email: target } })
      : await this.prisma.user.findUnique({ where: { phone: target } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: channel === 'EMAIL' ? target : null,
          phone: channel === 'PHONE' ? target : null,
          profile: { create: {} },
          verification: { create: { phoneVerified: channel === 'PHONE' } },
        },
      });
    } else if (channel === 'PHONE') {
      await this.prisma.sellerVerification.upsert({
        where: { userId: user.id },
        create: { userId: user.id, phoneVerified: true },
        update: { phoneVerified: true },
      });
    }

    if (user.status !== 'ACTIVE') throw new UnauthorizedException('ACCOUNT_UNAVAILABLE');
    return this.issueSession(user.id, user.role, meta);
  }

  async issueSession(userId: string, role: UserRole, meta: { userAgent?: string; ip?: string }) {
    const accessToken = await this.jwt.signAsync({ sub: userId, role });
    const refreshToken = randomBytes(48).toString('base64url');
    const tokenHash = this.digest(refreshToken, 'REFRESH_TOKEN_PEPPER');
    const ipHash = meta.ip ? this.digest(meta.ip, 'IP_HASH_PEPPER') : null;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60_000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        userAgent: meta.userAgent?.slice(0, 500),
        ipHash,
      },
    });
    return { accessToken, refreshToken, expiresAt };
  }

  async refresh(refreshToken: string | undefined, meta: { userAgent?: string; ip?: string }) {
    if (!refreshToken) throw new UnauthorizedException('REFRESH_REQUIRED');
    const tokenHash = this.digest(refreshToken, 'REFRESH_TOKEN_PEPPER');
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!row || row.revokedAt || row.expiresAt <= new Date() || row.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('REFRESH_INVALID');
    }

    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });
    return this.issueSession(row.userId, row.user.role, meta);
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    const tokenHash = this.digest(refreshToken, 'REFRESH_TOKEN_PEPPER');
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

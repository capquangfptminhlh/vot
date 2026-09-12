import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthRequest, AuthUser } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new UnauthorizedException('AUTH_REQUIRED');
    let payload: { sub: string; role: AuthUser['role'] };
    try { payload = await this.jwt.verifyAsync(token); } catch { throw new UnauthorizedException('INVALID_ACCESS_TOKEN'); }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true, status: true } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('ACCOUNT_UNAVAILABLE');
    req.user = { id: user.id, role: user.role };
    return true;
  }
}

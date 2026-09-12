import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { OtpChannel } from '../generated/prisma/client';
import { AuthService } from './auth.service';
import { RequestOtpDto, VerifyOtpDto } from './dto';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  private meta(req: Request) { return { userAgent: req.headers['user-agent'], ip: req.ip }; }
  private setRefresh(res: Response, token: string, expiresAt: Date) {
    res.cookie('cv_refresh', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/v1/auth', expires: expiresAt });
  }
  @Post('otp/request') request(@Body() dto: RequestOtpDto) { return this.auth.requestOtp(dto.channel as OtpChannel, dto.target); }
  @Post('otp/verify') async verify(@Body() dto: VerifyOtpDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.loginWithOtp(dto.channel as OtpChannel, dto.target, dto.code, this.meta(req));
    this.setRefresh(res, session.refreshToken, session.expiresAt);
    return { accessToken: session.accessToken };
  }
  @Post('refresh') async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.refresh(req.cookies?.cv_refresh, this.meta(req));
    this.setRefresh(res, session.refreshToken, session.expiresAt);
    return { accessToken: session.accessToken };
  }
  @Post('logout') async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.cv_refresh);
    res.clearCookie('cv_refresh', { path: '/api/v1/auth' });
    return { ok: true };
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import type { Request } from 'express';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from '../common/auth.types';
import { VerificationService } from './verification.service';

class PhoneDto {
  @IsString()
  @Length(8, 25)
  phone!: string;
}

class PhoneVerifyDto extends PhoneDto {
  @IsString()
  @Length(6, 8)
  code!: string;
}

@Controller('verification')
export class VerificationController {
  constructor(private readonly service: VerificationService) {}

  @UseGuards(AuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.service.me(user.id);
  }

  @UseGuards(AuthGuard)
  @Post('phone/request')
  requestPhone(
    @CurrentUser() user: AuthUser,
    @Body() body: PhoneDto,
    @Req() req: Request,
  ) {
    return this.service.requestPhone(user.id, body.phone, req.ip);
  }

  @UseGuards(AuthGuard)
  @Post('phone/verify')
  verifyPhone(
    @CurrentUser() user: AuthUser,
    @Body() body: PhoneVerifyDto,
    @Req() req: Request,
  ) {
    return this.service.verifyPhone(user.id, body.phone, body.code, req.ip);
  }

  @UseGuards(AuthGuard)
  @Post(':kind/session')
  session(@CurrentUser() user: AuthUser, @Param('kind') kind: string) {
    if (kind !== 'identity' && kind !== 'bank') throw new BadRequestException('INVALID_KIND');
    return this.service.startProvider(user.id, kind);
  }

  @Post('webhook/:kind')
  webhook(
    @Param('kind') kind: string,
    @Headers('x-chovot-kyc-secret') secret: string | undefined,
    @Body() body: unknown,
  ) {
    if (kind !== 'identity' && kind !== 'bank') throw new BadRequestException('INVALID_KIND');
    return this.service.webhook(kind, secret, body);
  }
}

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthRequest } from './auth.types';
@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const user = ctx.switchToHttp().getRequest<AuthRequest>().user;
    if (!user || !['MODERATOR','ADMIN'].includes(user.role)) throw new ForbiddenException('STAFF_REQUIRED');
    return true;
  }
}

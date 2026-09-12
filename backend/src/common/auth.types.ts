import type { Request } from 'express';
import type { UserRole } from '../generated/prisma/client';
export type AuthUser = { id: string; role: UserRole };
export type AuthRequest = Request & { user: AuthUser };

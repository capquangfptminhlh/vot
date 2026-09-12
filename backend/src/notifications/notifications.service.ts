import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, limit = 30) {
    const take = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const [rows, unread] = await Promise.all([
      this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { unread, items: rows };
  }

  async markRead(userId: string, id: string) {
    const row = await this.prisma.notification.findUnique({ where: { id }, select: { userId: true, readAt: true } });
    if (!row) throw new NotFoundException('NOTIFICATION_NOT_FOUND');
    if (row.userId !== userId) throw new ForbiddenException('NOTIFICATION_FORBIDDEN');
    if (row.readAt) return { ok: true, readAt: row.readAt };
    const updated = await this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    return { ok: true, readAt: updated.readAt };
  }

  async markAllRead(userId: string) {
    const now = new Date();
    const result = await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: now } });
    return { ok: true, updated: result.count, readAt: now };
  }
}

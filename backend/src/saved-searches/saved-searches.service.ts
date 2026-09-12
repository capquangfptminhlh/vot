import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavedSearchDto, UpdateSavedSearchDto } from './dto';

@Injectable()
export class SavedSearchesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const rows = await this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return rows.map((row) => this.publicRow(row));
  }

  async create(userId: string, dto: CreateSavedSearchDto) {
    const count = await this.prisma.savedSearch.count({ where: { userId } });
    if (count >= 20) throw new ForbiddenException('SAVED_SEARCH_LIMIT_REACHED');
    const hasFilter = [dto.query, dto.brandSlug, dto.modelSlug, dto.province, dto.condition].some((value) => String(value || '').trim()) || dto.minPriceVnd != null || dto.maxPriceVnd != null;
    if (!hasFilter) throw new BadRequestException('SAVED_SEARCH_FILTER_REQUIRED');
    if (dto.minPriceVnd != null && dto.maxPriceVnd != null && dto.minPriceVnd > dto.maxPriceVnd) throw new BadRequestException('PRICE_RANGE_INVALID');

    const row = await this.prisma.savedSearch.create({
      data: {
        userId,
        name: this.clean(dto.name, 80),
        query: this.clean(dto.query, 120),
        brandSlug: this.clean(dto.brandSlug, 100),
        modelSlug: this.clean(dto.modelSlug, 140),
        minPriceVnd: dto.minPriceVnd == null ? null : BigInt(dto.minPriceVnd),
        maxPriceVnd: dto.maxPriceVnd == null ? null : BigInt(dto.maxPriceVnd),
        province: this.clean(dto.province, 100),
        condition: this.clean(dto.condition, 120),
        notifyEnabled: Boolean(dto.notifyEnabled),
      },
    });
    return this.publicRow(row);
  }

  async update(userId: string, id: string, dto: UpdateSavedSearchDto) {
    await this.owned(userId, id);
    const row = await this.prisma.savedSearch.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: this.clean(dto.name, 80) } : {}),
        ...(dto.notifyEnabled !== undefined ? { notifyEnabled: dto.notifyEnabled } : {}),
      },
    });
    return this.publicRow(row);
  }

  async remove(userId: string, id: string) {
    await this.owned(userId, id);
    await this.prisma.savedSearch.delete({ where: { id } });
    return { ok: true };
  }

  private async owned(userId: string, id: string) {
    const row = await this.prisma.savedSearch.findUnique({ where: { id }, select: { userId: true } });
    if (!row) throw new NotFoundException('SAVED_SEARCH_NOT_FOUND');
    if (row.userId !== userId) throw new ForbiddenException('SAVED_SEARCH_FORBIDDEN');
    return row;
  }

  private clean(value: unknown, max: number) {
    const text = String(value || '').trim().slice(0, max);
    return text || null;
  }

  private publicRow(row: any) {
    return {
      id: row.id,
      name: row.name,
      query: row.query,
      brandSlug: row.brandSlug,
      modelSlug: row.modelSlug,
      minPriceVnd: row.minPriceVnd == null ? null : Number(row.minPriceVnd),
      maxPriceVnd: row.maxPriceVnd == null ? null : Number(row.maxPriceVnd),
      province: row.province,
      condition: row.condition,
      notifyEnabled: row.notifyEnabled,
      lastNotifiedAt: row.lastNotifiedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

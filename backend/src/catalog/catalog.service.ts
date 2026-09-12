import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async brands(query = '', limit = 100) {
    const q = query.trim().slice(0, 80);
    const rows = await this.prisma.brand.findMany({
      where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
      orderBy: { name: 'asc' },
      take: Math.min(Math.max(Number(limit) || 100, 1), 200),
      include: { _count: { select: { models: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      country: row.country,
      officialUrl: row.officialUrl,
      modelCount: row._count.models,
    }));
  }

  async modelsForBrand(slug: string, query = '', limit = 100) {
    const brand = await this.prisma.brand.findUnique({ where: { slug } });
    if (!brand) throw new NotFoundException('BRAND_NOT_FOUND');
    const q = query.trim().slice(0, 100);
    const rows = await this.prisma.paddleModel.findMany({
      where: {
        brandId: brand.id,
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
      take: Math.min(Math.max(Number(limit) || 100, 1), 200),
    });
    return {
      brand: { id: brand.id, slug: brand.slug, name: brand.name },
      models: rows.map((row) => this.publicModel(row, brand)),
    };
  }

  async model(slug: string) {
    const row = await this.prisma.paddleModel.findUnique({
      where: { slug },
      include: { brand: true },
    });
    if (!row) throw new NotFoundException('MODEL_NOT_FOUND');
    return this.publicModel(row, row.brand);
  }

  async search(query: string, limit = 30) {
    const q = query.trim().slice(0, 100);
    if (!q) return [];
    const rows = await this.prisma.paddleModel.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { brand: { name: { contains: q, mode: 'insensitive' } } },
        ],
      },
      include: { brand: true },
      orderBy: [{ brand: { name: 'asc' } }, { name: 'asc' }],
      take: Math.min(Math.max(Number(limit) || 30, 1), 60),
    });
    return rows.map((row) => this.publicModel(row, row.brand));
  }

  private publicModel(row: any, brand: any) {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      generation: row.generation,
      thicknessMm: row.thicknessMm == null ? null : Number(row.thicknessMm),
      surface: row.surface,
      core: row.core,
      shape: row.shape,
      averageWeightOz: row.averageWeightOz == null ? null : Number(row.averageWeightOz),
      lengthIn: row.lengthIn == null ? null : Number(row.lengthIn),
      widthIn: row.widthIn == null ? null : Number(row.widthIn),
      gripLengthIn: row.gripLengthIn == null ? null : Number(row.gripLengthIn),
      gripCircumferenceIn: row.gripCircumferenceIn == null ? null : Number(row.gripCircumferenceIn),
      approval: row.approval,
      nfc: row.nfc,
      playStyle: row.playStyle,
      sourceUrl: row.sourceUrl,
      verifiedAt: row.verifiedAt,
      brand: { id: brand.id, slug: brand.slug, name: brand.name },
    };
  }
}

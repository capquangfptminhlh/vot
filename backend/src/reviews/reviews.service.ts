import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSeller(sellerId: string, limit = 20) {
    const rows = await this.prisma.review.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(Number(limit) || 20, 1), 50),
      include: {
        reviewer: { include: { profile: true } },
        listing: { select: { id: true, title: true } },
      },
    });
    return rows.map((row) => this.publicReview(row));
  }

  async create(reviewerId: string, listingId: string, dto: CreateReviewDto) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        conversations: { where: { buyerId: reviewerId }, select: { id: true }, take: 1 },
      },
    });
    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');
    if (listing.sellerId === reviewerId) throw new BadRequestException('SELF_REVIEW_NOT_ALLOWED');
    if (listing.status !== 'SOLD') throw new ForbiddenException('REVIEW_AFTER_SOLD_ONLY');
    if (!listing.conversations.length) throw new ForbiddenException('INTERACTION_REQUIRED');

    const exists = await this.prisma.review.findUnique({
      where: { reviewerId_listingId: { reviewerId, listingId } },
      select: { id: true },
    });
    if (exists) throw new ConflictException('REVIEW_ALREADY_EXISTS');

    const comment = String(dto.comment || '').trim().slice(0, 1200);
    const created = await this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: { reviewerId, sellerId: listing.sellerId, listingId, rating: dto.rating, comment },
        include: { reviewer: { include: { profile: true } }, listing: { select: { id: true, title: true } } },
      });
      const aggregate = await tx.review.aggregate({
        where: { sellerId: listing.sellerId },
        _avg: { rating: true },
        _count: { rating: true },
      });
      await tx.profile.upsert({
        where: { userId: listing.sellerId },
        create: {
          userId: listing.sellerId,
          rating: aggregate._avg.rating ?? null,
          ratingCount: aggregate._count.rating,
        },
        update: {
          rating: aggregate._avg.rating ?? null,
          ratingCount: aggregate._count.rating,
        },
      });
      await tx.notification.create({
        data: {
          userId: listing.sellerId,
          kind: 'SELLER_REVIEW',
          title: 'Bạn có đánh giá mới',
          body: `Một người đã từng trao đổi về tin “${listing.title.slice(0, 80)}” đánh giá ${dto.rating}/5 sao.`,
          url: `nguoi-ban.html?id=${listing.sellerId}`,
        },
      });
      return review;
    });
    return this.publicReview(created);
  }

  async eligibility(reviewerId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { conversations: { where: { buyerId: reviewerId }, select: { id: true }, take: 1 } },
    });
    if (!listing || listing.sellerId === reviewerId) return { eligible: false, reason: 'NOT_ELIGIBLE' };
    const existing = await this.prisma.review.findUnique({
      where: { reviewerId_listingId: { reviewerId, listingId } },
      select: { id: true },
    });
    if (existing) return { eligible: false, reason: 'ALREADY_REVIEWED' };
    if (listing.status !== 'SOLD') return { eligible: false, reason: 'LISTING_NOT_SOLD' };
    if (!listing.conversations.length) return { eligible: false, reason: 'NO_INTERACTION' };
    return { eligible: true, reason: null };
  }

  private publicReview(row: any) {
    return {
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.createdAt,
      reviewer: {
        displayName: row.reviewer?.profile?.displayName || 'Thành viên ChoVot',
        avatarUrl: row.reviewer?.profile?.avatarUrl || null,
      },
      listing: row.listing ? { id: row.listing.id, title: row.listing.title } : null,
      label: 'Đánh giá sau tương tác',
    };
  }
}

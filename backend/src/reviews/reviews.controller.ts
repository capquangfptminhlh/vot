import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from '../common/auth.types';
import { CreateReviewDto } from './dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Get('seller/:sellerId')
  listSeller(@Param('sellerId', ParseUUIDPipe) sellerId: string, @Query('limit') limit = '20') {
    return this.service.listSeller(sellerId, Number(limit));
  }

  @UseGuards(AuthGuard)
  @Get('listing/:listingId/eligibility')
  eligibility(@CurrentUser() user: AuthUser, @Param('listingId', ParseUUIDPipe) listingId: string) {
    return this.service.eligibility(user.id, listingId);
  }

  @UseGuards(AuthGuard)
  @Post('listing/:listingId')
  create(@CurrentUser() user: AuthUser, @Param('listingId', ParseUUIDPipe) listingId: string, @Body() dto: CreateReviewDto) {
    return this.service.create(user.id, listingId, dto);
  }
}

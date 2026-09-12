import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from '../common/auth.types';
import { CompleteImageDto, CreateListingDto, PresignImageDto, ReportDto } from './dto';
import { ListingsService } from './listings.service';

@Controller('listings')
export class ListingsController {
  constructor(private readonly service: ListingsService) {}

  @Get()
  list(@Query('q') q = '', @Query('limit') limit = '30') { return this.service.listPublic(q, Number(limit) || 30); }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) { return this.service.getPublic(id); }

  @UseGuards(AuthGuard)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateListingDto) { return this.service.createDraft(user.id, dto); }

  @UseGuards(AuthGuard)
  @Post(':id/images/presign')
  presign(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: PresignImageDto) { return this.service.presign(user.id, id, dto); }

  @UseGuards(AuthGuard)
  @Post(':id/images/complete')
  complete(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CompleteImageDto) { return this.service.completeImage(user.id, id, dto); }

  @UseGuards(AuthGuard)
  @Post(':id/submit')
  submit(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.service.submit(user.id, id); }

  @UseGuards(AuthGuard)
  @Post(':id/sold')
  sold(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.service.markSold(user.id, id); }

  @UseGuards(AuthGuard)
  @Get(':id/favorite')
  favorite(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.service.favoriteState(user.id, id); }

  @UseGuards(AuthGuard)
  @Post(':id/favorite/toggle')
  toggle(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.service.toggleFavorite(user.id, id); }

  @UseGuards(AuthGuard)
  @Post(':id/reports')
  report(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReportDto) { return this.service.report(user.id, id, dto); }
}

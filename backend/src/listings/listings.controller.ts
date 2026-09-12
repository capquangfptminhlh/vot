import { Body, Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard'; import { CurrentUser } from '../common/current-user.decorator'; import type { AuthUser } from '../common/auth.types';
import { CompleteImageDto, CreateListingDto, PresignImageDto, ReportDto } from './dto'; import { ListingsService } from './listings.service';
@Controller('listings')
export class ListingsController {
 constructor(private readonly service:ListingsService){}
 @Get() list(@Query('q') q='',@Query('limit') limit='30'){return this.service.listPublic(q,Number(limit)||30)}
 @Get(':id') get(@Param('id',ParseUUIDPipe) id:string){return this.service.getPublic(id)}
 @UseGuards(AuthGuard) @Post() create(@CurrentUser() u:AuthUser,@Body() dto:CreateListingDto){return this.service.createDraft(u.id,dto)}
 @UseGuards(AuthGuard) @Post(':id/images/presign') presign(@CurrentUser() u:AuthUser,@Param('id',ParseUUIDPipe) id:string,@Body() dto:PresignImageDto){return this.service.presign(u.id,id,dto)}
 @UseGuards(AuthGuard) @Post(':id/images/complete') complete(@CurrentUser() u:AuthUser,@Param('id',ParseUUIDPipe) id:string,@Body() dto:CompleteImageDto){return this.service.completeImage(u.id,id,dto)}
 @UseGuards(AuthGuard) @Post(':id/submit') submit(@CurrentUser() u:AuthUser,@Param('id',ParseUUIDPipe) id:string){return this.service.submit(u.id,id)}
 @UseGuards(AuthGuard) @Get(':id/favorite') favorite(@CurrentUser() u:AuthUser,@Param('id',ParseUUIDPipe) id:string){return this.service.favoriteState(u.id,id)}
 @UseGuards(AuthGuard) @Post(':id/favorite/toggle') toggle(@CurrentUser() u:AuthUser,@Param('id',ParseUUIDPipe) id:string){return this.service.toggleFavorite(u.id,id)}
 @UseGuards(AuthGuard) @Post(':id/reports') report(@CurrentUser() u:AuthUser,@Param('id',ParseUUIDPipe) id:string,@Body() dto:ReportDto){return this.service.report(u.id,id,dto)}
}

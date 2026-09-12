import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from '../common/auth.types';
import { CreateSavedSearchDto, UpdateSavedSearchDto } from './dto';
import { SavedSearchesService } from './saved-searches.service';

@UseGuards(AuthGuard)
@Controller('saved-searches')
export class SavedSearchesController {
  constructor(private readonly service: SavedSearchesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) { return this.service.list(user.id); }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSavedSearchDto) { return this.service.create(user.id, dto); }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSavedSearchDto) {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.service.remove(user.id, id); }
}

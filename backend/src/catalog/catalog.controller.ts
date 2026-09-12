import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('brands')
  brands(@Query('q') q = '', @Query('limit') limit = '100') {
    return this.catalog.brands(q, Number(limit));
  }

  @Get('brands/:slug/models')
  models(@Param('slug') slug: string, @Query('q') q = '', @Query('limit') limit = '100') {
    return this.catalog.modelsForBrand(slug, q, Number(limit));
  }

  @Get('models/search')
  search(@Query('q') q = '', @Query('limit') limit = '30') {
    return this.catalog.search(q, Number(limit));
  }

  @Get('models/:slug')
  model(@Param('slug') slug: string) {
    return this.catalog.model(slug);
  }
}

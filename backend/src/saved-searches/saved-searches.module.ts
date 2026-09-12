import { Module } from '@nestjs/common';
import { SavedSearchesController } from './saved-searches.controller';
import { SavedSearchesService } from './saved-searches.service';

@Module({ controllers: [SavedSearchesController], providers: [SavedSearchesService], exports: [SavedSearchesService] })
export class SavedSearchesModule {}

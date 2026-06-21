import { Module } from '@nestjs/common';
import { VideosPublicController, VideosAdminController } from './videos.controller';
import { VideosService } from './videos.service';
import { DoodstreamModule } from '../doodstream/doodstream.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [DoodstreamModule, StorageModule],
  controllers: [VideosPublicController, VideosAdminController],
  providers: [VideosService],
})
export class VideosModule {}

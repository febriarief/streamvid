import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DoodstreamService } from './doodstream.service';
import { DoodstreamController } from './doodstream.controller';

@Module({
  imports: [ConfigModule],
  controllers: [DoodstreamController],
  providers: [DoodstreamService],
  exports: [DoodstreamService],
})
export class DoodstreamModule {}

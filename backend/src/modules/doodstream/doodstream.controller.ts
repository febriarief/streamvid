import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DoodstreamService } from './doodstream.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('doodstream')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class DoodstreamController {
  constructor(private doodstreamService: DoodstreamService) {}

  @Get('info')
  getInfo(@Query('url') url: string) {
    return this.doodstreamService.getMetadata(url);
  }
}
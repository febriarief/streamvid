import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { GetTrendingVideosDto } from './dto/get-trending-videos.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { VideoStatus } from '../../../generated/prisma/enums';

type UploadedThumbnailFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

// ─── Public routes ────────────────────────────────────────
@Controller('videos')
export class VideosPublicController {
  constructor(private videosService: VideosService) {}

  @Get()
  findAll(
    @Query() query: {
      search?: string;
      categoryId?: string;
      sort?: 'latest' | 'popular';
      page?: number;
      limit?: number;
    },
  ) {
    return this.videosService.findAll(query);
  }

  @Get('trending')
  findTrending(@Query() query: GetTrendingVideosDto) {
    return this.videosService.findTrending(query);
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(@Param('slug') slug: string, @Req() req: Request) {
    const user = req.user as { userId: string } | undefined;

    return this.videosService.findBySlug(slug, user?.userId);
  }
}

// ─── Admin routes ─────────────────────────────────────────
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class VideosAdminController {
  constructor(private videosService: VideosService) {}

  @Get('stats')
  getStats() {
    return this.videosService.getStats();
  }

  @Get('videos')
  findAll(@Query() query: { page?: number; limit?: number; status?: VideoStatus }) {
    return this.videosService.findAllAdmin(query);
  }

  @Post('videos')
  create(@Body() dto: CreateVideoDto) {
    return this.videosService.create(dto);
  }

  @Post('videos/thumbnail')
  @UseInterceptors(FileInterceptor('file'))
  uploadThumbnail(@UploadedFile() file: UploadedThumbnailFile) {
    return this.videosService.uploadThumbnail(file);
  }

  @Put('videos/:id')
  update(@Param('id') id: string, @Body() dto: UpdateVideoDto) {
    return this.videosService.update(id, dto);
  }

  @Delete('videos/:id')
  remove(@Param('id') id: string) {
    return this.videosService.remove(id);
  }

  @Patch('videos/:id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: VideoStatus) {
    return this.videosService.updateStatus(id, status);
  }
}

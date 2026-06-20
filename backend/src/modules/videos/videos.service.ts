import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DoodstreamService } from '../doodstream/doodstream.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { GetTrendingVideosDto } from './dto/get-trending-videos.dto';
import { VideoStatus } from '../../../generated/prisma/enums';
import slugify from 'slugify';

@Injectable()
export class VideosService {
  constructor(
    private prisma: PrismaService,
    private doodstream: DoodstreamService,
  ) {}

  private parsePositiveInt(value: number | string | undefined, fallback: number): number {
    const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : value;

    if (!parsed || Number.isNaN(parsed) || parsed < 1) {
      return fallback;
    }

    return parsed;
  }

  private generateSlug(title: string): string {
    const base = slugify(title, { lower: true, strict: true });
    const suffix = Math.random().toString(36).slice(2, 6);
    return `${base}-${suffix}`;
  }

  // ─── Public ───────────────────────────────────────────────

  async findAll(query: {
    search?: string;
    categoryId?: string;
    sort?: 'latest' | 'popular';
    page?: number | string;
    limit?: number | string;
  }) {
    const page = this.parsePositiveInt(query.page, 1);
    const limit = this.parsePositiveInt(query.limit, 12);
    const { search, categoryId, sort } = query;

    const where: Prisma.VideoWhereInput = { status: VideoStatus.PUBLISHED };
    if (search) where.title = { contains: search, mode: 'insensitive' };
    if (categoryId) where.categoryId = categoryId;
    const orderBy: Prisma.VideoOrderByWithRelationInput =
      sort === 'popular' ? { viewCount: 'desc' } : { createdAt: 'desc' };

    const [videos, total] = await Promise.all([
      this.prisma.db.video.findMany({
        where,
        include: { category: true, tags: true },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.db.video.count({ where }),
    ]);

    return { videos, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findBySlug(slug: string, userId?: string) {
    const video = await this.prisma.db.video.findUnique({
      where: { slug, status: VideoStatus.PUBLISHED },
      include: { category: true, tags: true },
    });
    if (!video) throw new NotFoundException('Video not found');

    await this.prisma.db.$transaction([
      this.prisma.db.video.update({
        where: { id: video.id },
        data: { viewCount: { increment: 1 } },
      }),
      this.prisma.db.view.create({
        data: {
          videoId: video.id,
          userId,
        },
      }),
    ]);

    return video;
  }

  async findTrending(query: GetTrendingVideosDto) {
    const period = query.period ?? 'week';
    const limit = this.parsePositiveInt(query.limit, 20);

    if (period === 'all') {
      const videos = await this.prisma.db.video.findMany({
        where: { status: VideoStatus.PUBLISHED },
        include: { category: true, tags: true },
        orderBy: [
          { viewCount: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
      });

      return videos.map((video) => ({
        ...video,
        trendingViews: video.viewCount,
      }));
    }

    const since = new Date();

    if (period === 'today') {
      since.setHours(since.getHours() - 24);
    } else if (period === 'week') {
      since.setDate(since.getDate() - 7);
    } else {
      since.setDate(since.getDate() - 30);
    }

    const groupedViews = await this.prisma.db.view.groupBy({
      by: ['videoId'],
      where: {
        createdAt: {
          gte: since,
        },
        video: {
          status: VideoStatus.PUBLISHED,
        },
      },
      _count: {
        videoId: true,
      },
      orderBy: {
        _count: {
          videoId: 'desc',
        },
      },
      take: limit,
    });

    if (groupedViews.length === 0) {
      return [];
    }

    const videoIds = groupedViews.map((view) => view.videoId);
    const videos = await this.prisma.db.video.findMany({
      where: {
        id: {
          in: videoIds,
        },
        status: VideoStatus.PUBLISHED,
      },
      include: { category: true, tags: true },
    });

    const videoById = new Map(videos.map((video) => [video.id, video]));

    return groupedViews
      .map((view) => {
        const video = videoById.get(view.videoId);

        if (!video) {
          return null;
        }

        return {
          ...video,
          trendingViews: view._count.videoId,
        };
      })
      .filter((video): video is NonNullable<typeof video> => video !== null);
  }

  // ─── Admin ────────────────────────────────────────────────

  async findAllAdmin(query: { page?: number | string; limit?: number | string; status?: VideoStatus }) {
    const page = this.parsePositiveInt(query.page, 1);
    const limit = this.parsePositiveInt(query.limit, 20);
    const { status } = query;
    const where: any = {};
    if (status) where.status = status;

    const [videos, total] = await Promise.all([
      this.prisma.db.video.findMany({
        where,
        include: { category: true, tags: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.db.video.count({ where }),
    ]);

    return { videos, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(dto: CreateVideoDto) {
    const metadata = await this.doodstream.getMetadata(dto.doodUrl);

    const video = await this.prisma.db.video.create({
      data: {
        title: dto.title,
        description: dto.description,
        slug: this.generateSlug(dto.title),
        doodFileId: metadata.doodFileId,
        doodUrl: metadata.doodUrl,
        embedUrl: metadata.embedUrl,
        thumbnailUrl: metadata.thumbnailUrl,
        duration: metadata.duration,
        status: dto.status ?? VideoStatus.DRAFT,
        categoryId: dto.categoryId ?? null,
        tags: dto.tags?.length
          ? {
              connectOrCreate: dto.tags.map((name) => ({
                where: { name },
                create: { name },
              })),
            }
          : undefined,
      },
      include: { category: true, tags: true },
    });

    return video;
  }

  async update(id: string, dto: UpdateVideoDto) {
    const existing = await this.prisma.db.video.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Video not found');

    return this.prisma.db.video.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        categoryId: dto.categoryId,
        tags: dto.tags?.length
          ? {
              set: [],
              connectOrCreate: dto.tags.map((name) => ({
                where: { name },
                create: { name },
              })),
            }
          : undefined,
      },
      include: { category: true, tags: true },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.db.video.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Video not found');
    await this.prisma.db.video.delete({ where: { id } });
    return { message: 'Video deleted' };
  }

  async updateStatus(id: string, status: VideoStatus) {
    const existing = await this.prisma.db.video.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Video not found');
    return this.prisma.db.video.update({ where: { id }, data: { status } });
  }

  async getStats() {
    const [totalVideos, publishedVideos, totalViews, totalUsers] = await Promise.all([
      this.prisma.db.video.count(),
      this.prisma.db.video.count({ where: { status: VideoStatus.PUBLISHED } }),
      this.prisma.db.video.aggregate({ _sum: { viewCount: true } }),
      this.prisma.db.user.count(),
    ]);

    return {
      totalVideos,
      publishedVideos,
      draftVideos: totalVideos - publishedVideos,
      totalViews: totalViews._sum.viewCount ?? 0,
      totalUsers,
    };
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly videoInclude = {
    category: true,
    tags: true,
  } satisfies Prisma.VideoInclude;

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const username = dto.username.trim();

    const existingUser = await this.prisma.db.user.findFirst({
      where: {
        username,
        NOT: { id: userId },
      },
    });

    if (existingUser) {
      throw new ConflictException('Username already taken');
    }

    const updatedUser = await this.prisma.db.user.update({
      where: { id: userId },
      data: { username },
    });

    return this.serializeUser(updatedUser);
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isSameAsCurrentPassword = await bcrypt.compare(dto.newPassword, user.passwordHash);

    if (isSameAsCurrentPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.db.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password updated successfully' };
  }

  async getWatchHistory(userId: string) {
    const views = await this.prisma.db.view.findMany({
      where: {
        userId,
        video: {
          status: 'PUBLISHED',
        },
      },
      include: {
        video: {
          include: this.videoInclude,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return views.map((view) => ({
      id: view.id,
      videoId: view.videoId,
      createdAt: view.createdAt,
      video: view.video,
    }));
  }

  async deleteWatchHistoryItem(userId: string, videoId: string) {
    const result = await this.prisma.db.view.deleteMany({
      where: {
        userId,
        videoId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Watch history item not found');
    }

    return { message: 'Watch history item deleted' };
  }

  async clearWatchHistory(userId: string) {
    await this.prisma.db.view.deleteMany({
      where: {
        userId,
      },
    });

    return { message: 'Watch history cleared' };
  }

  async getMostWatched(userId: string) {
    const groupedViews = await this.prisma.db.view.groupBy({
      by: ['videoId'],
      where: {
        userId,
        video: {
          status: 'PUBLISHED',
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
    });

    if (groupedViews.length === 0) {
      return [];
    }

    const videos = await this.prisma.db.video.findMany({
      where: {
        id: {
          in: groupedViews.map((view) => view.videoId),
        },
        status: 'PUBLISHED',
      },
      include: this.videoInclude,
    });

    const videoById = new Map(videos.map((video) => [video.id, video]));

    return groupedViews
      .map((view) => {
        const video = videoById.get(view.videoId);

        if (!video) {
          return null;
        }

        return {
          videoId: view.videoId,
          watchCount: view._count.videoId,
          video,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }

  private serializeUser(user: {
    id: string;
    email: string;
    username: string;
    role: 'USER' | 'ADMIN';
    avatar: string | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      avatar: user.avatar ?? undefined,
    };
  }
}

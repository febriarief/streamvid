import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '../../../generated/prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly videoInclude = {
    category: true,
    tags: true,
  } satisfies Prisma.VideoInclude;

  private readonly userAdminSelect = {
    id: true,
    email: true,
    username: true,
    role: true,
    avatar: true,
    createdAt: true,
    updatedAt: true,
    _count: {
      select: {
        views: true,
      },
    },
  } satisfies Prisma.UserSelect;

  async findAllAdmin(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where.role = query.role;
    }

    const [users, total] = await Promise.all([
      this.prisma.db.user.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { username: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: this.userAdminSelect,
      }),
      this.prisma.db.user.count({ where }),
    ]);

    return {
      users: users.map((user) => this.serializeAdminUser(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createAdminUser(dto: AdminCreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim();

    await this.ensureEmailAndUsernameAvailable(email, username);

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.db.user.create({
      data: {
        email,
        username,
        passwordHash,
        role: dto.role,
      },
      select: this.userAdminSelect,
    });

    return this.serializeAdminUser(user);
  }

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

  async updateAdminUser(actorUserId: string, userId: string, dto: AdminUpdateUserDto) {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
      select: this.userAdminSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const email = dto.email?.trim().toLowerCase();
    const username = dto.username?.trim();

    if (email || username) {
      await this.ensureEmailAndUsernameAvailable(email, username, userId);
    }

    if (actorUserId === userId && dto.role && dto.role !== user.role) {
      throw new BadRequestException('You cannot change your own role');
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (email) {
      updateData.email = email;
    }

    if (username) {
      updateData.username = username;
    }

    if (dto.role) {
      updateData.role = dto.role;
    }

    if (dto.password?.trim()) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    const updatedUser = await this.prisma.db.user.update({
      where: { id: userId },
      data: updateData,
      select: this.userAdminSelect,
    });

    return this.serializeAdminUser(updatedUser);
  }

  async remove(actorUserId: string, userId: string) {
    if (actorUserId === userId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.db.user.delete({
      where: { id: userId },
    });

    return { message: 'User deleted' };
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

  private async ensureEmailAndUsernameAvailable(
    email?: string,
    username?: string,
    excludeUserId?: string
  ) {
    if (!email && !username) {
      return;
    }

    const existing = await this.prisma.db.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(username ? [{ username }] : []),
        ],
        ...(excludeUserId
          ? {
              NOT: { id: excludeUserId },
            }
          : {}),
      },
    });

    if (!existing) {
      return;
    }

    if (email && existing.email === email) {
      throw new ConflictException('Email already taken');
    }

    if (username && existing.username === username) {
      throw new ConflictException('Username already taken');
    }
  }

  private serializeAdminUser(user: {
    id: string;
    email: string;
    username: string;
    role: Role;
    avatar: string | null;
    createdAt: Date;
    updatedAt: Date;
    _count: {
      views: number;
    };
  }) {
    return {
      ...this.serializeUser(user),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      watchHistoryCount: user._count.views,
    };
  }
}

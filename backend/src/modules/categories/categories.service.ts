import { Prisma } from '../../../generated/prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import slugify from 'slugify';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private parsePositiveInt(value: number | string | undefined, fallback: number): number {
    const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : value;

    if (!parsed || Number.isNaN(parsed) || parsed < 1) {
      return fallback;
    }

    return parsed;
  }

  async findAll() {
    return this.prisma.db.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findAllAdmin(query: { page?: number | string; limit?: number | string; search?: string }) {
    const page = this.parsePositiveInt(query.page, 1);
    const limit = this.parsePositiveInt(query.limit, 10);
    const where: Prisma.CategoryWhereInput = {};

    if (query.search?.trim()) {
      where.OR = [
        { name: { contains: query.search.trim(), mode: 'insensitive' } },
        { slug: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }

    const [categories, total] = await Promise.all([
      this.prisma.db.category.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.db.category.count({ where }),
    ]);

    return {
      categories,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const category = await this.prisma.db.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async create(dto: CreateCategoryDto) {
    const name = dto.name.trim();
    const slug = await this.generateUniqueSlug(name);

    return this.prisma.db.category.create({
      data: {
        name,
        slug,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureExists(id);

    if (!dto.name?.trim()) {
      return this.findOne(id);
    }

    const name = dto.name.trim();
    const slug = await this.generateUniqueSlug(name, id);

    return this.prisma.db.category.update({
      where: { id },
      data: {
        name,
        slug,
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);

    await this.prisma.db.category.delete({
      where: { id },
    });

    return { message: 'Category deleted' };
  }

  private async ensureExists(id: string) {
    const category = await this.prisma.db.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  private async generateUniqueSlug(name: string, excludeId?: string) {
    const baseSlug = slugify(name, { lower: true, strict: true }) || 'category';
    let slug = baseSlug;
    let counter = 1;

    while (await this.slugExists(slug, excludeId)) {
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }

  private async slugExists(slug: string, excludeId?: string) {
    const existing = await this.prisma.db.category.findFirst({
      where: {
        slug,
        ...(excludeId
          ? {
              NOT: { id: excludeId },
            }
          : {}),
      },
    });

    return Boolean(existing);
  }
}

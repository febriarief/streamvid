import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  updateMe(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMe((req.user as { userId: string }).userId, dto);
  }

  @Patch('me/password')
  updatePassword(@Req() req: Request, @Body() dto: UpdatePasswordDto) {
    return this.usersService.updatePassword((req.user as { userId: string }).userId, dto);
  }

  @Get('me/history')
  getWatchHistory(@Req() req: Request) {
    return this.usersService.getWatchHistory((req.user as { userId: string }).userId);
  }

  @Delete('me/history/:videoId')
  deleteWatchHistoryItem(@Req() req: Request, @Param('videoId') videoId: string) {
    return this.usersService.deleteWatchHistoryItem((req.user as { userId: string }).userId, videoId);
  }

  @Delete('me/history')
  clearWatchHistory(@Req() req: Request) {
    return this.usersService.clearWatchHistory((req.user as { userId: string }).userId);
  }

  @Get('me/most-watched')
  getMostWatched(@Req() req: Request) {
    return this.usersService.getMostWatched((req.user as { userId: string }).userId);
  }
}

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query() query: ListUsersQueryDto) {
    return this.usersService.findAllAdmin(query);
  }

  @Post()
  create(@Body() dto: AdminCreateUserDto) {
    return this.usersService.createAdminUser(dto);
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.usersService.updateAdminUser((req.user as { userId: string }).userId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.usersService.remove((req.user as { userId: string }).userId, id);
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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

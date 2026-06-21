import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { VideoStatus } from '../../../../generated/prisma/enums';

export class CreateVideoDto {
  @IsUrl()
  doodUrl!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  thumbnailUrl?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsEnum(VideoStatus)
  @IsOptional()
  status?: VideoStatus;
}

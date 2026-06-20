import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import { VideoStatus } from '../../../../generated/prisma/enums';
import { PartialType } from '../../../common/partial-type.helper';
import { CreateVideoDto } from './create-video.dto';

export class UpdateVideoDto extends PartialType(CreateVideoDto) {
  @IsUrl()
  @IsOptional()
  doodUrl?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

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

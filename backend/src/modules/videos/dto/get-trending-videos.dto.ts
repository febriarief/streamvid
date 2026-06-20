import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetTrendingVideosDto {
  @IsOptional()
  @IsIn(['today', 'week', 'month', 'all'])
  period?: 'today' | 'week' | 'month' | 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

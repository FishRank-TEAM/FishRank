import { IsBoolean, IsIn, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateCatchRankingDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  rankScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lengthCm?: number;

  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  status?: 'pending' | 'approved' | 'rejected';

  @IsOptional()
  @IsBoolean()
  excludeFromRanking?: boolean;
}

import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewCatchDto {
  @IsIn(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

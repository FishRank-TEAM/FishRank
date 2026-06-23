import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateReportDto {
  @IsIn(['catch', 'post'])
  targetType!: 'catch' | 'post';

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  targetId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  detail?: string;
}

import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveReportDto {
  @IsIn(['dismiss', 'delete'])
  action: 'dismiss' | 'delete';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;
}

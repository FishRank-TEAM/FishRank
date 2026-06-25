import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFeedbackDto {
  @IsIn(['open', 'in_progress', 'resolved', 'dismissed'])
  status!: 'open' | 'in_progress' | 'resolved' | 'dismissed';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;
}

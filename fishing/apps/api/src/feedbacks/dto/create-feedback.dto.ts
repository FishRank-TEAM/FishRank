import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFeedbackDto {
  @IsIn(['bug', 'feature', 'improvement', 'other'])
  category!: 'bug' | 'feature' | 'improvement' | 'other';

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  content!: string;
}

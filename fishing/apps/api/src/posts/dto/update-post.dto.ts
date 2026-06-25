import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePostDto {
  @IsString()
  @MaxLength(100)
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  catchId?: string;

  @IsOptional()
  @IsString()
  removeImage?: string;

  @IsOptional()
  @IsString()
  tags?: string;
}

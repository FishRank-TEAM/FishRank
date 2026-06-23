import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEncyclopediaTipDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  season?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bait?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  technique?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  habitat?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;
}

import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { FISH_CATEGORY_VALUES } from '../fish-category.util';

export class CreateEncyclopediaTipDto {
  @IsOptional()
  @IsIn([...FISH_CATEGORY_VALUES])
  category?: string;

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

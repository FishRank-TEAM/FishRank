import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { FISH_CATEGORY_VALUES } from '../fish-category.util';

export class CreateFishSpeciesDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nameKo!: string;

  @IsIn([...FISH_CATEGORY_VALUES])
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  scientificName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

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
}

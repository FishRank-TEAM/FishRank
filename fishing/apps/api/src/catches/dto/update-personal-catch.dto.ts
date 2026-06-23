import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePersonalCatchDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  locationName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fishSpeciesId?: number;
}

import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateSpeciesDto {
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  rarityWeight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minLengthCm?: number;
}

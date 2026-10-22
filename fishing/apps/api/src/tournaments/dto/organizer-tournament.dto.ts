import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class OrganizerTournamentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  title: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  description: string;

  @IsIn(['freshwater', 'saltwater', 'all'])
  category: 'freshwater' | 'saltwater' | 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  fishSpeciesId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  region?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minLengthCm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxLengthCm?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  prize?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  prizeAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sponsorName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxEntries?: number;

  @IsString()
  startAt: string;

  @IsString()
  endAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rules?: string;

  @IsOptional()
  @IsIn(['upcoming', 'active', 'closed', 'finished'])
  status?: 'upcoming' | 'active' | 'closed' | 'finished';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  spotLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  spotLng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(30)
  spotRadiusKm?: number;
}

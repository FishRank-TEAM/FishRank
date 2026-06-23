import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ALL_ACTIVITY_REGION_VALUES } from '../../common/constants/korean-regions';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string | null;

  @IsOptional()
  @IsIn(ALL_ACTIVITY_REGION_VALUES)
  activityRegion?: string;
  @IsOptional()
  @IsIn(['freshwater', 'saltwater', 'both'])
  fishingCategory?: 'freshwater' | 'saltwater' | 'both';
}

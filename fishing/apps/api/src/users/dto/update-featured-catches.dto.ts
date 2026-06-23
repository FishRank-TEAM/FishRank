import { IsArray, ArrayMaxSize, IsUUID } from 'class-validator';

export class UpdateFeaturedCatchesDto {
  @IsArray()
  @ArrayMaxSize(3)
  @IsUUID('4', { each: true })
  catchIds: string[];
}

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertUserGearDto {
  @IsString()
  @MaxLength(80)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

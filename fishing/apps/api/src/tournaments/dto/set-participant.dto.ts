import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class SetParticipantDto {
  @IsBoolean()
  disqualified: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

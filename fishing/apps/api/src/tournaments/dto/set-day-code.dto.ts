import { IsString, MaxLength, MinLength } from 'class-validator';

export class SetDayCodeDto {
  @IsString()
  @MinLength(4)
  @MaxLength(12)
  code: string;
}

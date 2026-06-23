import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: '낚시왕철수' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  nickname: string;
}

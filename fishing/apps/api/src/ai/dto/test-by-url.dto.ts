import { IsString, Matches } from 'class-validator';

export class TestByUrlDto {
  @IsString()
  @Matches(/^\/uploads\/.+\.(jpe?g|png|webp|gif)$/i, {
    message: 'imageUrl은 /uploads/ 경로의 이미지여야 합니다.',
  })
  imageUrl: string;
}

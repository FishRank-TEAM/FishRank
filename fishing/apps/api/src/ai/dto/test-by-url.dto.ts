import { IsString, Matches } from 'class-validator';

export class TestByUrlDto {
  @IsString()
  @Matches(/^\/uploads\/[^/\\]+?\.(jpe?g|png|webp|gif)$/i, {
    message: 'imageUrl은 /uploads/ 바로 아래의 이미지 파일이어야 합니다.',
  })
  imageUrl: string;
}

import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { hasImageMagic } from './image-magic.util';
import { removeUploadedFile } from './image-integrity.util';

@Injectable()
export class ImageMagicInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<{ file?: Express.Multer.File }>();
    const file = req.file;
    if (file?.path) {
      const ok = await hasImageMagic(file.path);
      if (!ok) {
        await removeUploadedFile(file.path);
        throw new BadRequestException('jpg, png, webp, gif 이미지 내용이 아닙니다.');
      }
    }
    return next.handle();
  }
}

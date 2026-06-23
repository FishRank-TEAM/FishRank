import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

const ALLOWED_EXT = /jpeg|jpg|png|webp|gif/;

export function imageFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) {
  if (ALLOWED_EXT.test(extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('jpg, png, webp, gif 형식만 업로드 가능합니다.'), false);
  }
}

export function createImageUploadInterceptor(fieldName: string, prefix: string) {
  return FileInterceptor(fieldName, {
    storage: diskStorage({
      destination: './uploads',
      filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${prefix}-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: imageFileFilter,
  });
}

export function saveUploadedFile(file?: Express.Multer.File): string | null {
  return file ? `/uploads/${file.filename}` : null;
}

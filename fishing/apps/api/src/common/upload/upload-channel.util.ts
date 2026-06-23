import { ForbiddenException } from '@nestjs/common';

export const UPLOAD_CHANNEL_APP = 'app';
export const UPLOAD_CHANNEL_WEB = 'web';

export function assertAppUploadChannel(channel: string | undefined): void {
  if (channel !== UPLOAD_CHANNEL_APP) {
    throw new ForbiddenException(
      '공식 인증 업로드는 FishRank 앱(실시간 촬영)에서만 가능합니다.',
    );
  }
}

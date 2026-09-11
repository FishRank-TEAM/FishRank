/**
 * Antifraud helpers for precision measurement (Phase 5).
 * Certified uploads must stay camera-only; gallery URIs are rejected.
 */

export function assertInAppCameraUri(uri: string): void {
  const lower = uri.toLowerCase();
  const allowed =
    lower.startsWith('file://') ||
    lower.startsWith('ph://') ||
    lower.startsWith('content://') ||
    lower.startsWith('data:image');
  if (!allowed) {
    throw new Error('인앱 카메라 촬영 이미지만 허용됩니다.');
  }
  // Heuristic: block obvious gallery picker paths when marked
  if (lower.includes('image_picker') && lower.includes('library')) {
    throw new Error('갤러리 업로드는 정밀 측정에서 차단됩니다.');
  }
}

export function shouldRejectLowConfidence(reason?: string): boolean {
  return reason === 'low_confidence' || reason === 'depth_unavailable';
}

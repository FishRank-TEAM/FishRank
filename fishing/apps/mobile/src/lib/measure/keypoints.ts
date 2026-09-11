import { api } from '@/lib/api';

export type KeypointPair = {
  head: { x: number; y: number };
  tail: { x: number; y: number };
  confidence: number;
  method: string;
  imageWidth: number;
  imageHeight: number;
};

/**
 * Upload a local photo URI and receive head/tail keypoints in image pixel space.
 * Proxied via Nest `/ai/keypoints` → FastAPI `/keypoints`.
 */
export async function fetchKeypoints(uri: string): Promise<KeypointPair | null> {
  const form = new FormData();
  form.append('image', {
    uri,
    name: `measure-${Date.now()}.jpg`,
    type: 'image/jpeg',
  } as unknown as Blob);

  const res = await api.post('/ai/keypoints', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });

  const data = res.data?.data ?? res.data;
  if (!data?.head || !data?.tail) return null;

  return {
    head: { x: Number(data.head.x), y: Number(data.head.y) },
    tail: { x: Number(data.tail.x), y: Number(data.tail.y) },
    confidence: Number(data.confidence ?? 0),
    method: String(data.method ?? 'unknown'),
    imageWidth: Number(data.imageWidth ?? 0),
    imageHeight: Number(data.imageHeight ?? 0),
  };
}

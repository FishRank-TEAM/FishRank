import { readFile } from 'fs/promises';
import { decode as decodeJpeg } from 'jpeg-js';
import { PNG } from 'pngjs';

export const PERCEPTUAL_HASH_BITS = 64;
export const PERCEPTUAL_HAMMING_THRESHOLD = 8;

const HASH_WIDTH = 9;
const HASH_HEIGHT = 8;

export function dHashFromRgba(width: number, height: number, data: Uint8Array): string {
  if (width < 2 || height < 1 || data.length < width * height * 4) {
    throw new Error('image too small');
  }

  const gray = new Float64Array(HASH_WIDTH * HASH_HEIGHT);
  const counts = new Float64Array(HASH_WIDTH * HASH_HEIGHT);
  for (let y = 0; y < height; y += 1) {
    const ty = Math.min(HASH_HEIGHT - 1, Math.floor((y * HASH_HEIGHT) / height));
    for (let x = 0; x < width; x += 1) {
      const tx = Math.min(HASH_WIDTH - 1, Math.floor((x * HASH_WIDTH) / width));
      const i = (y * width + x) * 4;
      const luma = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const bucket = ty * HASH_WIDTH + tx;
      gray[bucket] += luma;
      counts[bucket] += 1;
    }
  }

  let bits = 0n;
  for (let y = 0; y < HASH_HEIGHT; y += 1) {
    for (let x = 0; x < HASH_WIDTH - 1; x += 1) {
      const left = gray[y * HASH_WIDTH + x] / (counts[y * HASH_WIDTH + x] || 1);
      const right = gray[y * HASH_WIDTH + x + 1] / (counts[y * HASH_WIDTH + x + 1] || 1);
      bits = (bits << 1n) | (left > right ? 1n : 0n);
    }
  }

  return bits.toString(16).padStart(16, '0');
}

export function hammingDistance(left: string, right: string): number {
  if (!/^[0-9a-f]{16}$/.test(left) || !/^[0-9a-f]{16}$/.test(right)) {
    return PERCEPTUAL_HASH_BITS;
  }
  let distance = 0;
  let bits = BigInt(`0x${left}`) ^ BigInt(`0x${right}`);
  while (bits) {
    distance += Number(bits & 1n);
    bits >>= 1n;
  }
  return distance;
}

export function isNearDuplicate(
  left: string,
  right: string,
  threshold = PERCEPTUAL_HAMMING_THRESHOLD,
): boolean {
  return hammingDistance(left, right) <= threshold;
}

export async function computePerceptualHash(filePath: string): Promise<string | null> {
  try {
    const buffer = await readFile(filePath);
    const decoded = decodeRaster(buffer);
    if (!decoded) return null;
    return dHashFromRgba(decoded.width, decoded.height, decoded.data);
  } catch {
    return null;
  }
}

function decodeRaster(buffer: Buffer): { width: number; height: number; data: Uint8Array } | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    const decoded = decodeJpeg(buffer, { useTArray: true, formatAsRGBA: true });
    return { width: decoded.width, height: decoded.height, data: decoded.data };
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    const png = PNG.sync.read(buffer);
    return { width: png.width, height: png.height, data: png.data };
  }
  return null;
}

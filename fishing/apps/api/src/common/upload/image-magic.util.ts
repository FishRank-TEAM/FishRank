import { open } from 'fs/promises';

export type ImageKind = 'jpeg' | 'png' | 'gif' | 'webp';

/** 확장자가 아니라 파일 앞부분으로 jpg/png/gif/webp 를 구분한다. */
export function detectImageKind(signature: Buffer): ImageKind | null {
  if (
    signature.length >= 3 &&
    signature[0] === 0xff &&
    signature[1] === 0xd8 &&
    signature[2] === 0xff
  ) {
    return 'jpeg';
  }

  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (signature.length >= png.length && signature.subarray(0, png.length).equals(png)) {
    return 'png';
  }

  if (signature.length >= 6 && signature.subarray(0, 4).toString('ascii') === 'GIF8') {
    return 'gif';
  }

  if (
    signature.length >= 12 &&
    signature.subarray(0, 4).toString('ascii') === 'RIFF' &&
    signature.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }

  return null;
}

export async function readImageSignature(filePath: string): Promise<Buffer> {
  const handle = await open(filePath, 'r');
  try {
    const buf = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buf, 0, 12, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

export async function hasImageMagic(filePath: string): Promise<boolean> {
  try {
    return detectImageKind(await readImageSignature(filePath)) !== null;
  } catch {
    return false;
  }
}

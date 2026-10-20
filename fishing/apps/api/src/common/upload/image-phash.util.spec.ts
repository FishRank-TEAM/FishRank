import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { encode as encodeJpeg } from 'jpeg-js';
import { PNG } from 'pngjs';
import {
  computePerceptualHash,
  dHashFromRgba,
  hammingDistance,
  isNearDuplicate,
} from './image-phash.util';

function rgba(width: number, height: number, paint: (x: number, y: number) => [number, number, number]) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = paint(x, y);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return data;
}

describe('perceptual hash', () => {
  it('같은 픽셀은 같은 해시이고 한 칸 차이는 가까운 중복이다', () => {
    const base = rgba(32, 24, (x, y) => [x * 8, y * 10, 40]);
    const shifted = rgba(32, 24, (x, y) => [Math.min(255, x * 8 + 3), y * 10, 40]);
    const inverted = rgba(32, 24, (x, y) => [255 - x * 8, 255 - y * 10, 200]);

    const baseHash = dHashFromRgba(32, 24, base);
    expect(dHashFromRgba(32, 24, base)).toBe(baseHash);
    expect(baseHash).toMatch(/^[0-9a-f]{16}$/);
    expect(isNearDuplicate(baseHash, dHashFromRgba(32, 24, shifted))).toBe(true);
    expect(hammingDistance(baseHash, dHashFromRgba(32, 24, inverted))).toBeGreaterThan(8);
  });

  it('형식이 아니면 거리를 최대로 본다', () => {
    expect(hammingDistance('abc', 'ffffffffffffffff')).toBe(64);
    expect(isNearDuplicate('abc', 'ffffffffffffffff')).toBe(false);
  });

  it('jpeg와 png는 해시를 만들고 webp·깨진 파일은 비운다', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'phash-'));
    const pixels = rgba(16, 16, (x) => (x < 8 ? [20, 20, 20] : [220, 220, 220]));
    const jpegPath = join(dir, 'fish.jpg');
    const pngPath = join(dir, 'fish.png');
    const webpPath = join(dir, 'fish.webp');
    const brokenPath = join(dir, 'broken.jpg');

    await writeFile(jpegPath, Buffer.from(encodeJpeg({ data: pixels, width: 16, height: 16 }, 90).data));
    const png = new PNG({ width: 16, height: 16 });
    png.data = Buffer.from(pixels);
    await writeFile(pngPath, PNG.sync.write(png));
    await writeFile(webpPath, Buffer.from('RIFF....WEBP'));
    await writeFile(brokenPath, Buffer.from([0xff, 0xd8, 0xff, 0x00]));

    const jpegHash = await computePerceptualHash(jpegPath);
    const pngHash = await computePerceptualHash(pngPath);
    expect(jpegHash).toMatch(/^[0-9a-f]{16}$/);
    expect(pngHash).toMatch(/^[0-9a-f]{16}$/);
    expect(isNearDuplicate(jpegHash!, pngHash!)).toBe(true);
    expect(await computePerceptualHash(webpPath)).toBeNull();
    expect(await computePerceptualHash(brokenPath)).toBeNull();
    expect(await computePerceptualHash(join(dir, 'missing.jpg'))).toBeNull();

    await rm(dir, { recursive: true, force: true });
  });
});

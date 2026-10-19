import { isAllowedImageExtension } from './upload.config';

describe('isAllowedImageExtension', () => {
  it.each(['fish.jpg', 'fish.JPEG', 'fish.jpeg', 'fish.png', 'fish.webp', 'fish.gif'])(
    '허용: %s',
    (name) => {
      expect(isAllowedImageExtension(name)).toBe(true);
    },
  );

  it.each(['fish.gifv', 'fish.pjpeg', 'fish.php', 'fish.jpg.php', 'fish.png.exe', 'fish', 'fish.jpg.svg'])(
    '거절: %s',
    (name) => {
      expect(isAllowedImageExtension(name)).toBe(false);
    },
  );
});

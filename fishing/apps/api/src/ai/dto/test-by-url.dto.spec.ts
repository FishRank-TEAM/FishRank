import { validate } from 'class-validator';
import { TestByUrlDto } from './test-by-url.dto';

async function errorsFor(imageUrl: string) {
  const dto = new TestByUrlDto();
  dto.imageUrl = imageUrl;
  return validate(dto);
}

describe('TestByUrlDto', () => {
  it('uploads 바로 아래 이미지는 허용한다', async () => {
    await expect(errorsFor('/uploads/bass.jpg')).resolves.toHaveLength(0);
  });

  it.each([
    '/uploads/../secret.jpg',
    '/uploads/foo/../../secret.jpg',
    '/etc/passwd',
    '/uploads/bass.jpg.php',
  ])('경로 탈출과 다른 확장자는 거절한다: %s', async (imageUrl) => {
    const errors = await errorsFor(imageUrl);
    expect(errors.length).toBeGreaterThan(0);
  });
});

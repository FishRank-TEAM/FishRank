import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PostsService } from './posts.service';

describe('PostsService.addComment', () => {
  const prisma = {
    post: { findFirst: jest.fn() },
    comment: { create: jest.fn() },
  };
  const service = new PostsService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('삭제된 글에는 댓글을 달 수 없다', async () => {
    prisma.post.findFirst.mockResolvedValue(null);

    await expect(service.addComment('post-1', 'user-1', '좋아요')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.comment.create).not.toHaveBeenCalled();
  });

  it('공백만 있는 댓글은 거절한다', async () => {
    await expect(service.addComment('post-1', 'user-1', '   ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.post.findFirst).not.toHaveBeenCalled();
  });

  it('내용의 앞뒤 공백을 제거하고 저장한다', async () => {
    prisma.post.findFirst.mockResolvedValue({ id: 'post-1' });
    prisma.comment.create.mockResolvedValue({ id: 'comment-1' });

    await service.addComment('post-1', 'user-1', '  포인트 정보 감사합니다  ');

    expect(prisma.post.findFirst).toHaveBeenCalledWith({
      where: { id: 'post-1', deletedAt: null },
      select: { id: true },
    });
    expect(prisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { postId: 'post-1', userId: 'user-1', content: '포인트 정보 감사합니다' },
      }),
    );
  });
});

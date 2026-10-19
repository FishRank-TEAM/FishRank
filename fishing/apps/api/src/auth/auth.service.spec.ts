import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService 계정 상태', () => {
  const users = {
    findByEmail: jest.fn(),
    findByNickname: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByIdIncludingDeleted: jest.fn(),
  };
  const jwt = {
    sign: jest.fn().mockReturnValue('signed-token'),
    verify: jest.fn(),
  };
  const service = new AuthService(users as never, jwt as never);

  const activeUser = {
    id: 'user-1',
    email: 'angler@example.com',
    nickname: '낚시왕',
    passwordHash: 'hash',
    deletedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jwt.sign.mockReturnValue('signed-token');
  });

  it('비밀번호가 맞고 정지되지 않은 계정은 토큰을 발급한다', async () => {
    users.findByEmail.mockResolvedValue(activeUser);
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await service.login({
      email: activeUser.email,
      password: 'password12',
    });

    expect(result.accessToken).toBe('signed-token');
    expect(jwt.sign).toHaveBeenCalled();
  });

  it('정지된 계정은 비밀번호가 맞아도 토큰을 발급하지 않는다', async () => {
    users.findByEmail.mockResolvedValue({ ...activeUser, deletedAt: new Date() });
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    await expect(
      service.login({ email: activeUser.email, password: 'password12' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('비밀번호가 틀리면 정지 여부와 관계없이 인증 실패다', async () => {
    users.findByEmail.mockResolvedValue({ ...activeUser, deletedAt: new Date() });
    jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      service.login({ email: activeUser.email, password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('정지된 계정의 리프레시 토큰은 거절한다', async () => {
    jwt.verify.mockReturnValue({ sub: activeUser.id, email: activeUser.email });
    users.findByIdIncludingDeleted.mockResolvedValue({
      ...activeUser,
      deletedAt: new Date(),
    });

    await expect(service.refresh('refresh-token')).rejects.toBeInstanceOf(ForbiddenException);
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('만료된 리프레시 토큰은 세션 만료로 거절한다', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    await expect(service.refresh('expired')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

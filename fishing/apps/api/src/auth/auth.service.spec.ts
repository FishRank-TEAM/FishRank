import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { hashRefreshToken } from './refresh-token.util';

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
    setRefreshTokenHash: jest.fn().mockResolvedValue({}),
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
    expect(users.setRefreshTokenHash).toHaveBeenCalledWith(
      activeUser.id,
      hashRefreshToken('signed-token'),
    );
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

  it('맞는 리프레시 토큰은 새 토큰으로 교체하고 이전 해시를 버린다', async () => {
    jwt.verify.mockReturnValue({ sub: activeUser.id, email: activeUser.email });
    jwt.sign.mockReturnValue('next-token');
    users.findByIdIncludingDeleted.mockResolvedValue({
      ...activeUser,
      refreshTokenHash: hashRefreshToken('current-refresh'),
    });

    const result = await service.refresh('current-refresh');

    expect(result.refreshToken).toBe('next-token');
    expect(users.setRefreshTokenHash).toHaveBeenCalledWith(
      activeUser.id,
      hashRefreshToken('next-token'),
    );
  });

  it('이미 회전된 리프레시 토큰은 세션을 폐기한다', async () => {
    jwt.verify.mockReturnValue({ sub: activeUser.id, email: activeUser.email });
    users.findByIdIncludingDeleted.mockResolvedValue({
      ...activeUser,
      refreshTokenHash: hashRefreshToken('current-refresh'),
    });

    await expect(service.refresh('stolen-old-refresh')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(users.setRefreshTokenHash).toHaveBeenCalledWith(activeUser.id, null);
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('저장되지 않은 기존 세션은 한 번 갱신되며 이후부터 회전한다', async () => {
    jwt.verify.mockReturnValue({ sub: activeUser.id, email: activeUser.email });
    jwt.sign.mockReturnValue('rotated');
    users.findByIdIncludingDeleted.mockResolvedValue({
      ...activeUser,
      refreshTokenHash: null,
    });

    await service.refresh('legacy-refresh');

    expect(users.setRefreshTokenHash).toHaveBeenCalledWith(activeUser.id, hashRefreshToken('rotated'));
  });

  it('로그아웃은 현재 리프레시 해시를 지운다', async () => {
    jwt.verify.mockReturnValue({ sub: activeUser.id, email: activeUser.email });
    users.findByIdIncludingDeleted.mockResolvedValue({
      ...activeUser,
      refreshTokenHash: hashRefreshToken('current-refresh'),
    });

    await service.logout('current-refresh');

    expect(users.setRefreshTokenHash).toHaveBeenCalledWith(activeUser.id, null);
  });

  it('다른 기기의 로그아웃은 현재 세션 해시를 지우지 않는다', async () => {
    jwt.verify.mockReturnValue({ sub: activeUser.id, email: activeUser.email });
    users.findByIdIncludingDeleted.mockResolvedValue({
      ...activeUser,
      refreshTokenHash: hashRefreshToken('current-refresh'),
    });

    await service.logout('other-device-refresh');

    expect(users.setRefreshTokenHash).not.toHaveBeenCalled();
  });

  it('만료된 리프레시 토큰은 세션 만료로 거절한다', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    await expect(service.refresh('expired')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

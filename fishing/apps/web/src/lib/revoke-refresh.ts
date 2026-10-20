import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export function revokeRefreshToken(refreshToken: string) {
  return axios
    .post(`${baseURL}/auth/logout`, { refreshToken }, { timeout: 5000 })
    .catch(() => undefined);
}

import axios from 'axios';
import { UPLOAD_CHANNEL_APP } from '@fishrank/shared';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './storage';

const baseURL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL,
  timeout: 30000,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((promise) => {
    if (error) promise.reject(error);
    else if (token) promise.resolve(token);
  });
  failedQueue = [];
}

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status !== 401 || !original || original._retry) {
      if (status === 401) await clearTokens();
      return Promise.reject(error);
    }

    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      await clearTokens();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = res.data.data;
      await setTokens(accessToken, newRefreshToken);
      processQueue(null, accessToken);
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      await clearTokens();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export async function uploadCertifiedCatch(
  uri: string,
  locationName?: string,
  memo?: string,
) {
  const form = new FormData();
  form.append('image', {
    uri,
    name: `catch-${Date.now()}.jpg`,
    type: 'image/jpeg',
  } as unknown as Blob);
  if (locationName) form.append('locationName', locationName);
  if (memo) form.append('memo', memo);

  return api.post('/catches', form, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'X-Upload-Channel': UPLOAD_CHANNEL_APP,
    },
  });
}

export { baseURL };

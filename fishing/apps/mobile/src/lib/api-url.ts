import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 4000;
const API_PATH = '/api/v1';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

/** Expo Metro 호스트(예: 192.168.0.10:8081)에서 PC IP 추출 */
function getExpoDevHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost;

  if (!hostUri) return null;

  const host = hostUri.split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return host;
}

function isAndroidEmulator(): boolean {
  return Platform.OS === 'android' && Constants.isDevice === false;
}

/**
 * API 베이스 URL 우선순위:
 * 1. EXPO_PUBLIC_API_URL (.env)
 * 2. Android 에뮬레이터 → 10.0.2.2 (WSL/Hyper-V LAN IP 172.x 는 에뮬에서 unreachable)
 * 3. Expo LAN 모드 Metro 호스트 IP (실기기)
 * 4. Android 실기기 fallback → 10.0.2.2
 * 5. iOS 시뮬레이터 / 로컬 → localhost
 */
export function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return normalizeBaseUrl(fromEnv);

  if (isAndroidEmulator()) {
    return `http://10.0.2.2:${API_PORT}${API_PATH}`;
  }

  const devHost = getExpoDevHost();
  if (devHost) {
    return `http://${devHost}:${API_PORT}${API_PATH}`;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${API_PORT}${API_PATH}`;
  }

  return `http://localhost:${API_PORT}${API_PATH}`;
}

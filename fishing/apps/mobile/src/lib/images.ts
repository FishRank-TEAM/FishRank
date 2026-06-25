import { baseURL } from './api';

const API_BASE = baseURL.replace(/\/api\/v1\/?$/, '');

export function getImageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}

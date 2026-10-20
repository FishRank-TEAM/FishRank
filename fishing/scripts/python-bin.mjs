import { spawnSync } from 'node:child_process';

export const PYTHON_CANDIDATES = [
  { command: 'py', prefix: ['-3.12'] },
  { command: 'python3', prefix: [] },
  { command: 'python', prefix: [] },
];

export function isPython312(version) {
  return Array.isArray(version) && (version[0] > 3 || (version[0] === 3 && version[1] >= 12));
}

export function selectPython(candidates, probe) {
  for (const candidate of candidates) {
    const version = probe(candidate);
    if (isPython312(version)) return { ...candidate, version };
  }
  return null;
}

export function probePython(candidate) {
  const result = spawnSync(
    candidate.command,
    [...candidate.prefix, '-c', 'import sys; print(f"{sys.version_info[0]}.{sys.version_info[1]}")'],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) return null;
  const [major, minor] = String(result.stdout || '')
    .trim()
    .split('.')
    .map((part) => Number(part));
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return null;
  return [major, minor];
}

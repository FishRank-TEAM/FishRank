import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { isPython312, selectPython } from './python-bin.mjs';

const fishingRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

test('3.11은 거절하고 3.12 이상은 허용한다', () => {
  assert.equal(isPython312([3, 11]), false);
  assert.equal(isPython312([3, 12]), true);
  assert.equal(isPython312([3, 13]), true);
  assert.equal(isPython312(null), false);
});

test('py 런처가 없으면 python3로 떨어진다', () => {
  const chosen = selectPython(
    [
      { command: 'py', prefix: ['-3.12'] },
      { command: 'python3', prefix: [] },
    ],
    (candidate) => (candidate.command === 'python3' ? [3, 12] : null),
  );
  assert.equal(chosen?.command, 'python3');
});

test('이 환경에서 래퍼가 Python 3.12를 실행한다', () => {
  const result = spawnSync(process.execPath, ['scripts/py.mjs', '-c', 'import sys; print(sys.version_info[:2])'], {
    cwd: fishingRoot,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /\(3, (1[2-9]|[2-9]\d)\)/);
});

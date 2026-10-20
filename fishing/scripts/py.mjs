#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { PYTHON_CANDIDATES, probePython, selectPython } from './python-bin.mjs';

const selected = selectPython(PYTHON_CANDIDATES, probePython);
if (!selected) {
  console.error(
    'Python 3.12 이상이 필요합니다. Windows는 py -3.12, 그 외에는 python3 를 설치하세요.',
  );
  process.exit(1);
}

const result = spawnSync(selected.command, [...selected.prefix, ...process.argv.slice(2)], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);

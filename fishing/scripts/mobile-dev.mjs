#!/usr/bin/env node
/**
 * Windows에서 npm/expo.cmd가 cmd 창을 반복 띄우는 문제 방지:
 * node로 expo CLI를 직접 실행하고 Ctrl+C 시 자식 프로세스 트리를 종료합니다.
 *
 * Android 에뮬레이터: WSL/Hyper-V LAN IP(172.x) 대신 localhost + adb reverse 사용.
 */
import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const mobileDir = path.join(root, 'apps/mobile');
const expoCli = path.join(root, 'node_modules/expo/bin/cli');
const isWin = process.platform === 'win32';

const KNOWN_FLAGS = new Set(['--tunnel', '--android', '--ios', '--lan', '--localhost', '--clear']);
const extraArgs = process.argv.slice(2);
const userArgs = extraArgs.filter((arg) => !KNOWN_FLAGS.has(arg));

const useTunnel = extraArgs.includes('--tunnel');
const useAndroid = extraArgs.includes('--android');
const useIos = extraArgs.includes('--ios');
const forceLan = extraArgs.includes('--lan');
const forceLocalhost = extraArgs.includes('--localhost');

function getConnectedEmulators() {
  try {
    const out = execSync('adb devices', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return [...out.matchAll(/^(emulator-\d+)\s+device$/gm)].map((match) => match[1]);
  } catch {
    return [];
  }
}

function setupAdbReverse(emulators, ports) {
  for (const id of emulators) {
    for (const port of ports) {
      try {
        execSync(`adb -s ${id} reverse tcp:${port} tcp:${port}`, { stdio: 'ignore' });
      } catch {
        /* emulator may still be booting */
      }
    }
  }
}

const emulators = getConnectedEmulators();
const hasEmulator = emulators.length > 0;

// 에뮬레이터/WSL 환경: LAN IP(172.x)로 Metro 연결 실패 방지
const useLocalhost = !forceLan && (forceLocalhost || useAndroid || hasEmulator);

const hostFlag = useTunnel ? '--tunnel' : useLocalhost ? '--localhost' : '--lan';
const expoArgs = ['start', hostFlag, ...userArgs];
if (useAndroid) expoArgs.push('--android');
if (useIos) expoArgs.push('--ios');

if (hasEmulator) {
  setupAdbReverse(emulators, [8081, 4000]);
  if (useLocalhost) {
    process.stderr.write(
      `Android 에뮬레이터 감지 — Metro localhost 모드 (adb reverse 8081, 4000)\n`,
    );
  }
}

const child = spawn(process.execPath, [expoCli, ...expoArgs], {
  cwd: mobileDir,
  stdio: 'inherit',
  windowsHide: true,
  env: {
    ...process.env,
    BROWSER: 'none',
    EXPO_NO_WEB_SETUP: '1',
  },
});

let exiting = false;

function killTree(pid) {
  if (!pid) return;
  if (isWin) {
    try {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    } catch {
      /* already dead */
    }
    return;
  }
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* ignore */
    }
  }
}

function shutdown(signal) {
  if (exiting) return;
  exiting = true;
  if (signal) {
    process.stderr.write('\n모바일 dev 서버 종료 중...\n');
  }
  killTree(child.pid);
  setTimeout(() => process.exit(0), 300);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
if (isWin) {
  process.on('SIGBREAK', () => shutdown('SIGBREAK'));
}

child.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (exiting) return;
  if (signal === 'SIGINT' || signal === 'SIGTERM') {
    process.exit(0);
    return;
  }
  process.exit(code ?? 1);
});

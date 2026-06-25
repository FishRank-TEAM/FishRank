#!/usr/bin/env node
/**
 * Expo/Metro 잔여 프로세스 정리 (Ctrl+C 후 cmd 창이 뜨는 현상 대응)
 */
import { execSync } from 'node:child_process';

const isWin = process.platform === 'win32';
const PORTS = [8081, 19000, 19001, 19002];

function killPortWin(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.includes('LISTENING')) continue;
      const parts = trimmed.split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid) && pid !== '0') {
        pids.add(pid);
      }
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
        console.log(`포트 ${port} — PID ${pid} 종료`);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* no listener */
  }
}

function killPortUnix(port) {
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: 'utf8' });
    for (const pid of out.split(/\s+/).filter(Boolean)) {
      try {
        process.kill(Number(pid), 'SIGTERM');
        console.log(`포트 ${port} — PID ${pid} 종료`);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* no listener */
  }
}

console.log('Expo/Metro 잔여 프로세스 정리 중...');
for (const port of PORTS) {
  if (isWin) killPortWin(port);
  else killPortUnix(port);
}
console.log('완료. 그래도 cmd 창이 뜨면 작업 관리자에서 node.exe를 확인하세요.');

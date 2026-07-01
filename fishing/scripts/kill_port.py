#!/usr/bin/env python3
"""지정 포트 LISTENING 프로세스 종료 (Windows/Linux)."""

from __future__ import annotations

import re
import subprocess
import sys


def _list_pids_on_port(port: int) -> set[int]:
    if sys.platform == "win32":
        script = (
            f"Get-NetTCPConnection -LocalPort {port} -State Listen -ErrorAction SilentlyContinue "
            "| Select-Object -ExpandProperty OwningProcess"
        )
        try:
            out = subprocess.check_output(
                ["powershell", "-NoProfile", "-Command", script],
                text=True,
                errors="replace",
            )
        except subprocess.CalledProcessError:
            return set()
        pids: set[int] = set()
        for line in out.splitlines():
            line = line.strip()
            if line.isdigit():
                pids.add(int(line))
        return pids

    out = subprocess.check_output(["ss", "-ltnp"], text=True, errors="replace")
    pids: set[int] = set()
    for match in re.finditer(rf":{port}\b", out):
        pid_match = re.search(r"pid=(\d+)", out[match.start() : match.start() + 120])
        if pid_match:
            pids.add(int(pid_match.group(1)))
    return pids


def _kill_pid(pid: int) -> None:
    if sys.platform == "win32":
        subprocess.run(["taskkill", "/PID", str(pid), "/F"], check=False)
    else:
        subprocess.run(["kill", "-9", str(pid)], check=False)


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: kill_port.py <port>", file=sys.stderr)
        sys.exit(1)

    port = int(sys.argv[1])
    pids = _list_pids_on_port(port)
    if not pids:
        print(f"port {port}: nothing to kill")
        return

    for pid in sorted(pids):
        _kill_pid(pid)
        print(f"killed pid {pid} on port {port}")


if __name__ == "__main__":
    main()

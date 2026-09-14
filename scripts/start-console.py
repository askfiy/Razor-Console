"""Windowless login launcher with logs and duplicate-launch protection."""

import ctypes
import hashlib
import os
from pathlib import Path
import sys


def main():
    root = Path(__file__).resolve().parents[1]
    os.chdir(root)
    identity = hashlib.sha256(str(root).lower().encode()).hexdigest()[:16]
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.CreateMutexW.argtypes = [ctypes.c_void_p, ctypes.c_bool, ctypes.c_wchar_p]
    kernel.CreateMutexW.restype = ctypes.c_void_p
    mutex = kernel.CreateMutexW(None, False, f"Local\\RazorConsole-{identity}")
    if not mutex:
        raise ctypes.WinError(ctypes.get_last_error())
    if ctypes.get_last_error() == 183:
        return
    logs = root / ".logs"
    logs.mkdir(exist_ok=True)
    with (logs / "startup.log").open("a", encoding="utf-8", buffering=1) as output:
        sys.stdout = sys.stderr = output
        try:
            import socket
            import uvicorn
            from razor_console.settings import settings

            # An already running instance (including a manual launch) owns this port.
            with socket.socket() as probe:
                probe.settimeout(1)
                if probe.connect_ex(("127.0.0.1", settings.port)) == 0:
                    print(f"Port {settings.port} is already in use; skipping startup.")
                    return
            uvicorn.run("razor_console.app:app", host=settings.host,
                        port=settings.port, access_log=False)
        except Exception:
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    main()

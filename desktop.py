"""Native Windows desktop entry point for Razor Console."""

from __future__ import annotations

import ctypes
from importlib.resources import files
import socket
from threading import Thread
import time
from urllib.error import URLError
from urllib.request import Request, urlopen


def _message(text: str, *, error: bool = True) -> None:
    flags = 0x10 if error else 0x40
    ctypes.windll.user32.MessageBoxW(None, text, "Razor Console", flags)


def _healthy(url: str) -> bool:
    try:
        with urlopen(f"{url}/api/health", timeout=0.5) as response:
            return response.status == 200
    except (OSError, URLError):
        return False


def _port_in_use(port: int) -> bool:
    with socket.socket() as probe:
        probe.settimeout(0.3)
        return probe.connect_ex(("127.0.0.1", port)) == 0


def _request_runtime_stop(url: str) -> None:
    try:
        request = Request(f"{url}/api/runtime/stop", data=b"", method="POST")
        with urlopen(request, timeout=5):
            pass
    except (OSError, URLError):
        pass


def main() -> int:
    try:
        import uvicorn
        import webview

        from razor_console.app import app
        from razor_console.settings import settings
        from razor_console.storage import data_directory
    except Exception as exc:
        _message(f"Razor Console 初始化失败：\n\n{exc}")
        return 1

    port = settings.port
    url = f"http://127.0.0.1:{port}"
    server = None
    server_thread = None

    if _port_in_use(port):
        if not _healthy(url):
            _message(f"端口 {port} 已被其他程序占用，Razor Console 无法启动。")
            return 1
    else:
        config = uvicorn.Config(
            app,
            host="127.0.0.1",
            port=port,
            access_log=False,
            log_level="warning",
        )
        server = uvicorn.Server(config)
        server_thread = Thread(target=server.run, name="RazorConsoleServer", daemon=True)
        server_thread.start()
        deadline = time.monotonic() + 12
        while time.monotonic() < deadline and not _healthy(url):
            if not server_thread.is_alive():
                break
            time.sleep(0.05)
        if not _healthy(url):
            server.should_exit = True
            _message("Razor Console 服务启动失败。")
            return 1

    ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("Razor.Console")
    window = webview.create_window(
        "Razor Console",
        url,
        width=1280,
        height=820,
        min_size=(360, 640),
        background_color="#000000",
    )

    def close_owned_server() -> None:
        if server is None:
            return
        _request_runtime_stop(url)
        server.should_exit = True

    window.events.closed += close_owned_server
    try:
        webview.start(
            gui="edgechromium",
            private_mode=False,
            storage_path=str(data_directory() / "WebView2"),
            icon=str(files("razor_console").joinpath("static", "razor.ico")),
        )
    except Exception as exc:
        close_owned_server()
        _message(
            "无法创建桌面窗口。请安装 Microsoft Edge WebView2 Runtime。"
            f"\n\n详细信息：{exc}"
        )
        return 1
    finally:
        if server is not None:
            server.should_exit = True
            if server_thread is not None:
                server_thread.join(timeout=5)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

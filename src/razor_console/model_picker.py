"""Native model chooser, isolated from the web server's event loop."""

import subprocess
import sys
from pathlib import Path


def choose_model(runtime_directory: Path) -> str | None:
    result = subprocess.run(
        [sys.executable, str(Path(__file__).resolve()), str(runtime_directory)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    selected = result.stdout.strip()
    if not selected:
        return None
    path = Path(selected).resolve()
    if not path.is_file() or path.suffix.lower() not in {".onnx", ".engine"}:
        raise ValueError("请选择存在的 .onnx 或 .engine 模型文件")
    try:
        return "./" + path.relative_to(runtime_directory.resolve()).as_posix()
    except ValueError:
        return path.as_posix()


def choose_runtime(initial_directory: Path, title: str = "绑定 Razor Runtime") -> Path | None:
    result = subprocess.run(
        [
            sys.executable,
            str(Path(__file__).resolve()),
            str(initial_directory),
            "directory",
            title,
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    return Path(result.stdout.strip()).resolve() if result.stdout.strip() else None


if __name__ == "__main__":
    import tkinter as tk
    from tkinter import filedialog

    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    directory = Path(sys.argv[1]) / "models"
    try:
        filename = (
            filedialog.askdirectory(
                parent=root,
                title=sys.argv[3] if len(sys.argv) > 3 else "绑定 Razor Runtime",
                initialdir=sys.argv[1],
                mustexist=True,
            )
            if len(sys.argv) > 2 and sys.argv[2] == "directory"
            else filedialog.askopenfilename(
                parent=root,
                title="选择推理模型",
                initialdir=str(directory),
                filetypes=[
                    ("推理模型", "*.onnx *.engine"),
                    ("ONNX", "*.onnx"),
                    ("TensorRT", "*.engine"),
                ],
            )
        )
        sys.stdout.reconfigure(encoding="utf-8")
        print(filename)
    finally:
        root.destroy()

"""Native model chooser, isolated from the web server's event loop."""

import subprocess
import sys
import tempfile
from pathlib import Path


def _choose_frozen(initial_directory: Path, mode: str, title: str) -> str:
    # A windowed executable has no stdout pipe. Return the selected path
    # through a temporary UTF-8 file instead of launching the desktop again.
    with tempfile.TemporaryDirectory(prefix="razor-picker-") as directory:
        result_path = Path(directory) / "selection.txt"
        subprocess.run(
            [sys.executable, "--native-picker", str(initial_directory), mode,
             title, str(result_path)],
            check=True,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        return result_path.read_text(encoding="utf-8").strip()


def choose_model(runtime_directory: Path) -> str | None:
    if getattr(sys, "frozen", False):
        selected = _choose_frozen(runtime_directory, "model", "选择推理模型")
    else:
        selected = _choose_source_model(runtime_directory)
    if not selected:
        return None
    path = Path(selected).resolve()
    if not path.is_file() or path.suffix.lower() not in {".onnx", ".engine"}:
        raise ValueError("请选择存在的 .onnx 或 .engine 模型文件")
    try:
        return "./" + path.relative_to(runtime_directory.resolve()).as_posix()
    except ValueError:
        return path.as_posix()


def _choose_source_model(runtime_directory: Path) -> str:
    result = subprocess.run(
        [sys.executable, str(Path(__file__).resolve()), str(runtime_directory)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    return result.stdout.strip()


def choose_runtime(initial_directory: Path, title: str = "绑定 Razor Runtime") -> Path | None:
    if getattr(sys, "frozen", False):
        selected = _choose_frozen(initial_directory, "directory", title)
        return Path(selected).resolve() if selected else None
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


def run_native_picker(arguments: list[str]) -> None:
    import tkinter as tk
    from tkinter import filedialog

    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    directory = Path(arguments[0]) / "models"
    try:
        filename = (
            filedialog.askdirectory(
                parent=root,
                title=arguments[2] if len(arguments) > 2 else "绑定 Razor Runtime",
                initialdir=arguments[0],
                mustexist=True,
            )
            if len(arguments) > 1 and arguments[1] == "directory"
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
        if len(arguments) > 3:
            Path(arguments[3]).write_text(filename, encoding="utf-8")
        else:
            sys.stdout.reconfigure(encoding="utf-8")
            print(filename)
    finally:
        root.destroy()


if __name__ == "__main__":
    run_native_picker(sys.argv[1:])

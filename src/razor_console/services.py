"""Local services owned by Razor Console."""

from __future__ import annotations

from collections import deque
from datetime import datetime
import mmap
import os
from pathlib import Path
import re
import struct
import subprocess
import tempfile
from threading import Lock, Thread
import time
from typing import Any

import tomlkit


_GAME_NAME_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")
_FRAME_MAP_NAME = "RazorConsole.Frame.v1"
_FRAME_CAPACITY = 2 * 1024 * 1024
_FRAME_HEADER = struct.Struct("<QQI")
_FRAME_MAP_SIZE = _FRAME_HEADER.size + _FRAME_CAPACITY
_EVENT_MAP_NAME = "RazorConsole.Events.v1"
_EVENT_CAPACITY = 64
_EVENT_NAME_SIZE = 32
_EVENT_HEADER = struct.Struct("<Q")
_EVENT_SLOT = struct.Struct(f"<QQ{_EVENT_NAME_SIZE}s")
_EVENT_MAP_SIZE = _EVENT_HEADER.size + _EVENT_CAPACITY * _EVENT_SLOT.size
_LOG_MAP_NAME = "RazorConsole.Logs.v1"
_LOG_CAPACITY = 256
_LOG_TEXT_SIZE = 768
_LOG_HEADER = struct.Struct("<Q")
_LOG_SLOT = struct.Struct(f"<QQH{_LOG_TEXT_SIZE}s")
_LOG_MAP_SIZE = _LOG_HEADER.size + _LOG_CAPACITY * _LOG_SLOT.size
_CONTROL_MAP_NAME = "RazorConsole.Control.v1"
_CONTROL_HEADER = struct.Struct("<Q")
_CONTROL_MAP_SIZE = _CONTROL_HEADER.size
_ANSI_ESCAPE_PATTERN = re.compile(r"\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1b\\))")
_LOG_LEVEL_PATTERN = re.compile(r"^(DEBUG|INFO|WARNING|ERROR|CRITICAL)\s*:")
_LOG_LEVELS = {
    "DEBUG": 10,
    "INFO": 20,
    "WARNING": 30,
    "ERROR": 40,
    "CRITICAL": 50,
}


class ConfigStore:
    """Read and mutate Runtime TOML files within the configured directory."""

    def __init__(self, runtime_directory: Path) -> None:
        self.runtime_directory = runtime_directory.resolve()
        self.boot_path = self.runtime_directory / "boot.toml"
        self.config_directory = self.runtime_directory / "config"
        self.trash_directory = self.runtime_directory / ".razor-trash"

    @staticmethod
    def _validate_toml(content: str) -> None:
        tomlkit.parse(content)

    @staticmethod
    def _read(path: Path) -> str:
        return path.read_text(encoding="utf-8")

    @staticmethod
    def _write_atomic(path: Path, content: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary_name: str | None = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                newline="",
                dir=path.parent,
                prefix=f".{path.name}.",
                suffix=".tmp",
                delete=False,
            ) as temporary:
                temporary.write(content)
                temporary.flush()
                os.fsync(temporary.fileno())
                temporary_name = temporary.name
            os.replace(temporary_name, path)
        finally:
            if temporary_name:
                Path(temporary_name).unlink(missing_ok=True)

    @staticmethod
    def _normalize_game_name(name: str) -> str:
        normalized = name.strip()
        if normalized.lower().endswith(".toml"):
            normalized = normalized[:-5]
        if not normalized or not _GAME_NAME_PATTERN.fullmatch(normalized):
            raise ValueError(
                "Game config name may contain only letters, numbers, '-' and '_'"
            )
        return normalized

    def _game_path(self, name: str) -> Path:
        normalized = self._normalize_game_name(name)
        return self.config_directory / f"{normalized}.toml"

    def list_games(self) -> list[str]:
        return sorted(path.stem for path in self.config_directory.glob("*.toml"))

    def active_loader(self) -> str:
        document = tomlkit.parse(self._read(self.boot_path))
        return str(document.get("system", {}).get("loader", ""))

    def summary(self) -> dict[str, Any]:
        return {
            "games": self.list_games(),
            "active_loader": self.active_loader(),
        }

    def read_boot(self) -> str:
        return self._read(self.boot_path)

    def read_game(self, name: str) -> str:
        path = self._game_path(name)
        if not path.is_file():
            raise FileNotFoundError(path.name)
        return self._read(path)

    def save_boot(self, content: str) -> None:
        self._validate_toml(content)
        self._write_atomic(self.boot_path, content)

    def save_game(self, name: str, content: str) -> None:
        path = self._game_path(name)
        if not path.is_file():
            raise FileNotFoundError(path.name)
        self._validate_toml(content)
        self._write_atomic(path, content)

    def create_game(self, name: str, source: str | None = None) -> str:
        normalized = self._normalize_game_name(name)
        destination = self._game_path(normalized)
        if destination.exists():
            raise FileExistsError(destination.name)

        if source:
            content = self.read_game(source)
        else:
            content = (
                f"# {normalized} Game Configuration\n\n"
                "[player]\n"
                'aiming_button = ["<mouse-right>"]\n'
                'firing_button = ["<mouse-left>"]\n'
                "paused_button = []\n"
                "switch_button = []\n"
            )
        self._validate_toml(content)
        self._write_atomic(destination, content)
        return normalized

    def delete_game(self, name: str) -> Path:
        normalized = self._normalize_game_name(name)
        if normalized == self.active_loader():
            raise ValueError("The active game config cannot be deleted")

        source = self._game_path(normalized)
        if not source.is_file():
            raise FileNotFoundError(source.name)

        self.trash_directory.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        destination = self.trash_directory / f"{timestamp}-{source.name}"
        source.replace(destination)
        return destination


class RuntimeProcess:
    """Manage one Runtime process launched by this Console instance."""

    def __init__(self, runtime_directory: Path) -> None:
        self.runtime_directory = runtime_directory.resolve()
        self._process: subprocess.Popen[str] | None = None
        self._lock = Lock()
        self._log_lock = Lock()
        self._logs: deque[dict[str, Any]] = deque(maxlen=1000)
        self._log_sequence = 0
        self._legacy_log_sequence = 0
        self._log_generation = 0
        self._output_thread: Thread | None = None
        self._has_managed_session = False
        self._reported_exit_pid: int | None = None

    def _append_log(self, level: int, text: str) -> None:
        """Append one line from the managed Runtime process."""
        clean_text = _ANSI_ESCAPE_PATTERN.sub("", text).rstrip()
        if not clean_text:
            return

        with self._log_lock:
            self._log_sequence += 1
            self._logs.append(
                {
                    "sequence": self._log_sequence,
                    "published_at_ms": time.time_ns() // 1_000_000,
                    "level": int(level),
                    "text": clean_text,
                }
            )

    @staticmethod
    def _line_level(text: str) -> int:
        match = _LOG_LEVEL_PATTERN.match(text.lstrip())
        if match is None:
            return 20
        return _LOG_LEVELS[match.group(1)]

    def _capture_output(self, process: subprocess.Popen[str]) -> None:
        """Drain Runtime output continuously so startup can never block on a pipe."""
        output = process.stdout
        if output is None:
            return
        try:
            for line in output:
                clean_line = _ANSI_ESCAPE_PATTERN.sub("", line).rstrip()
                self._append_log(self._line_level(clean_line), clean_line)
        finally:
            output.close()

    def _join_output_thread(self) -> None:
        thread = self._output_thread
        if thread is not None and thread.is_alive():
            thread.join(timeout=1)

    def _recent_log_text(self, limit: int = 12) -> str:
        with self._log_lock:
            records = list(self._logs)[-max(1, limit) :]
        return "\n".join(str(record["text"]) for record in records)

    @property
    def has_managed_session(self) -> bool:
        """Whether this Console has launched a Runtime in its current lifetime."""
        return self._has_managed_session

    @property
    def log_generation(self) -> int:
        """Return the current managed Runtime launch generation."""
        return self._log_generation

    def read_logs(
        self,
        after_sequence: int | None = None,
    ) -> list[dict[str, Any]]:
        """Read stdout/stderr records after a caller-owned sequence cursor."""
        with self._log_lock:
            cursor = (
                self._legacy_log_sequence
                if after_sequence is None
                else max(0, int(after_sequence))
            )
            records = [
                dict(record)
                for record in self._logs
                if int(record["sequence"]) > cursor
            ]
            if after_sequence is None and records:
                self._legacy_log_sequence = int(records[-1]["sequence"])
        return records

    @property
    def running(self) -> bool:
        process = self._process
        if process is None:
            return False

        exit_code = process.poll()
        if exit_code is None:
            return True

        if self._reported_exit_pid != process.pid:
            self._reported_exit_pid = process.pid
            self._append_log(
                40,
                f"Runtime process {process.pid} exited with code {exit_code}.",
            )
        return False

    def status(self) -> dict[str, Any]:
        return {
            "running": self.running,
            "pid": self._process.pid if self.running and self._process else None,
        }

    def _launch_command(self) -> tuple[list[str], dict[str, str]]:
        """Build an isolated launch command for the configured Runtime."""
        environment = os.environ.copy()
        environment.pop("VIRTUAL_ENV", None)
        environment.pop("PYTHONHOME", None)
        environment["PYTHONUNBUFFERED"] = "1"
        environment["PYTHONIOENCODING"] = "utf-8"
        environment["PYTHONUTF8"] = "1"

        if os.name == "nt":
            runtime_python = (
                self.runtime_directory / ".venv" / "Scripts" / "python.exe"
            )
            runtime_scripts = runtime_python.parent
        else:
            runtime_python = self.runtime_directory / ".venv" / "bin" / "python"
            runtime_scripts = runtime_python.parent

        if runtime_python.is_file():
            environment["VIRTUAL_ENV"] = str(runtime_python.parent.parent)
            environment["PATH"] = os.pathsep.join(
                (str(runtime_scripts), environment.get("PATH", ""))
            )
            return [str(runtime_python), "main.py"], environment

        raise RuntimeError(
            "Runtime .venv was not found; run `uv sync` in the Runtime directory"
        )

    def start(self) -> dict[str, Any]:
        with self._lock:
            if self.running:
                return self.status()

            command, environment = self._launch_command()
            with self._log_lock:
                self._logs.clear()
                self._log_sequence = 0
                self._legacy_log_sequence = 0
                self._log_generation += 1
            creation_flags = 0
            startup_info = None
            if os.name == "nt":
                creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP
                startup_info = subprocess.STARTUPINFO()
                startup_info.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startup_info.wShowWindow = subprocess.SW_HIDE

            self._process = subprocess.Popen(
                command,
                cwd=self.runtime_directory,
                env=environment,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                bufsize=1,
                creationflags=creation_flags,
                startupinfo=startup_info,
            )
            self._has_managed_session = True
            self._reported_exit_pid = None
            self._append_log(
                20,
                f"Console started Runtime process {self._process.pid}.",
            )
            self._output_thread = Thread(
                target=self._capture_output,
                args=(self._process,),
                name="RuntimeOutputReader",
                daemon=True,
            )
            self._output_thread.start()

            try:
                exit_code = self._process.wait(timeout=4.0)
            except subprocess.TimeoutExpired:
                return self.status()

            self._join_output_thread()
            self._process = None
            recent_logs = self._recent_log_text()
            message = f"Runtime exited during startup with code {exit_code}"
            if recent_logs:
                message = f"{message}\n\n{recent_logs}"
            raise RuntimeError(message)

    def stop(self, *, graceful_requested: bool = False) -> dict[str, Any]:
        with self._lock:
            if not self.running or self._process is None:
                return self.status()

            process = self._process
            if os.name == "nt":
                if graceful_requested:
                    try:
                        process.wait(timeout=4)
                    except subprocess.TimeoutExpired:
                        pass
                    else:
                        self._join_output_thread()
                        self._append_log(
                            20,
                            f"Runtime process {process.pid} stopped gracefully.",
                        )
                        self._process = None
                        return self.status()

                # A Windows venv python.exe is a launcher process. Sending
                # CTRL_BREAK can terminate that launcher while leaving the
                # real base-Python child alive with devices such as COM ports
                # still open. Kill the complete process tree while the tracked
                # launcher PID still exists so every native device handle is
                # released by the kernel.
                subprocess.run(
                    ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                    check=False,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    creationflags=subprocess.CREATE_NO_WINDOW,
                )
                try:
                    process.wait(timeout=4)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=1)
            else:
                process.terminate()
                try:
                    process.wait(timeout=4)
                except subprocess.TimeoutExpired:
                    process.kill()
            self._join_output_thread()
            self._append_log(20, f"Console stopped Runtime process {process.pid}.")
            self._process = None
            return self.status()


class SharedBridgeReader:
    """Read frames, sound events, and logs published by Razor Runtime."""

    def __init__(
        self,
        *,
        frame_max_age_seconds: float = 2.0,
        event_max_age_seconds: float = 5.0,
    ) -> None:
        self._frame_mapping: mmap.mmap | None = None
        self._event_mapping: mmap.mmap | None = None
        self._log_mapping: mmap.mmap | None = None
        self._control_mapping: mmap.mmap | None = None
        self._frame_max_age_ns = int(
            max(float(frame_max_age_seconds), 0.1) * 1_000_000_000
        )
        self._event_max_age_ns = int(
            max(float(event_max_age_seconds), 0.1) * 1_000_000_000
        )
        self._event_sequence = 0
        self._log_sequence = 0

        if os.name != "nt":
            return

        try:
            self._frame_mapping = mmap.mmap(
                -1,
                _FRAME_MAP_SIZE,
                tagname=_FRAME_MAP_NAME,
                access=mmap.ACCESS_WRITE,
            )
            self._event_mapping = mmap.mmap(
                -1,
                _EVENT_MAP_SIZE,
                tagname=_EVENT_MAP_NAME,
                access=mmap.ACCESS_WRITE,
            )
            (self._event_sequence,) = _EVENT_HEADER.unpack_from(
                self._event_mapping, 0
            )
            self._log_mapping = mmap.mmap(
                -1,
                _LOG_MAP_SIZE,
                tagname=_LOG_MAP_NAME,
                access=mmap.ACCESS_WRITE,
            )
            (self._log_sequence,) = _LOG_HEADER.unpack_from(
                self._log_mapping, 0
            )
            self._control_mapping = mmap.mmap(
                -1,
                _CONTROL_MAP_SIZE,
                tagname=_CONTROL_MAP_NAME,
                access=mmap.ACCESS_WRITE,
            )
        except (OSError, ValueError):
            self.close()

    def request_runtime_stop(self) -> bool:
        """Request a cooperative Runtime shutdown through shared memory."""
        mapping = self._control_mapping
        if mapping is None:
            return False
        (stop_sequence,) = _CONTROL_HEADER.unpack_from(mapping, 0)
        _CONTROL_HEADER.pack_into(mapping, 0, stop_sequence + 1)
        return True

    def read_frame(self) -> bytes | None:
        """Return one coherent, fresh JPEG snapshot or ``None``."""
        mapping = self._frame_mapping
        if mapping is None:
            return None

        for _ in range(3):
            version_before, published_at_ns, size = _FRAME_HEADER.unpack_from(
                mapping, 0
            )
            if (
                version_before == 0
                or version_before & 1
                or size == 0
                or size > _FRAME_CAPACITY
                or time.time_ns() - published_at_ns > self._frame_max_age_ns
            ):
                return None

            payload = bytes(
                mapping[_FRAME_HEADER.size : _FRAME_HEADER.size + size]
            )
            version_after, _, _ = _FRAME_HEADER.unpack_from(mapping, 0)
            if version_before == version_after and not version_after & 1:
                return payload

        return None

    def read_sound_events(self) -> list[dict[str, Any]]:
        """Drain fresh sound events from the shared-memory ring."""
        mapping = self._event_mapping
        if mapping is None:
            return []

        (write_sequence,) = _EVENT_HEADER.unpack_from(mapping, 0)
        if write_sequence <= self._event_sequence:
            return []

        first_sequence = max(
            self._event_sequence + 1,
            write_sequence - _EVENT_CAPACITY + 1,
        )
        now_ns = time.time_ns()
        events: list[dict[str, Any]] = []
        for sequence in range(first_sequence, write_sequence + 1):
            slot_index = (sequence - 1) % _EVENT_CAPACITY
            slot_offset = _EVENT_HEADER.size + slot_index * _EVENT_SLOT.size
            slot_sequence, published_at_ns, raw_name = _EVENT_SLOT.unpack_from(
                mapping, slot_offset
            )
            if (
                slot_sequence != sequence
                or now_ns - published_at_ns > self._event_max_age_ns
            ):
                continue

            name = raw_name.split(b"\0", 1)[0].decode("utf-8", errors="ignore")
            if name:
                events.append({"sequence": sequence, "name": name})

        self._event_sequence = write_sequence
        return events

    def read_logs(
        self,
        after_sequence: int | None = None,
    ) -> list[dict[str, Any]]:
        """Read Runtime logging records after a caller-owned sequence cursor."""
        mapping = self._log_mapping
        if mapping is None:
            return []

        (write_sequence,) = _LOG_HEADER.unpack_from(mapping, 0)
        cursor = (
            self._log_sequence
            if after_sequence is None
            else max(0, int(after_sequence))
        )
        if write_sequence <= cursor:
            return []

        first_sequence = max(
            cursor + 1,
            write_sequence - _LOG_CAPACITY + 1,
        )
        records: list[dict[str, Any]] = []
        for sequence in range(first_sequence, write_sequence + 1):
            slot_index = (sequence - 1) % _LOG_CAPACITY
            slot_offset = _LOG_HEADER.size + slot_index * _LOG_SLOT.size
            slot_sequence, published_at_ns, level, raw_text = _LOG_SLOT.unpack_from(
                mapping, slot_offset
            )
            if slot_sequence != sequence:
                continue

            text = raw_text.split(b"\0", 1)[0].decode("utf-8", errors="ignore")
            if text:
                records.append(
                    {
                        "sequence": sequence,
                        "published_at_ms": published_at_ns // 1_000_000,
                        "level": level,
                        "text": text,
                    }
                )

        if after_sequence is None:
            self._log_sequence = write_sequence
        return records

    def close(self) -> None:
        frame_mapping, self._frame_mapping = self._frame_mapping, None
        event_mapping, self._event_mapping = self._event_mapping, None
        log_mapping, self._log_mapping = self._log_mapping, None
        control_mapping, self._control_mapping = self._control_mapping, None
        if frame_mapping is not None:
            frame_mapping.close()
        if event_mapping is not None:
            event_mapping.close()
        if log_mapping is not None:
            log_mapping.close()
        if control_mapping is not None:
            control_mapping.close()

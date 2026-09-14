"""Console-owned settings.

These settings configure the Console service itself. Runtime tuning remains in
the Runtime TOML files and is intentionally not duplicated here.
"""

import json
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class ConsoleSettings(BaseSettings):
    """Settings required to locate and serve a Razor Runtime installation."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="RAZOR_CONSOLE_",
        extra="ignore",
    )

    host: str = "0.0.0.0"
    port: int = 8765
    runtime_directory: Path = Path(r"D:\Project\Razor\Razor-Runtime")
    runtime_bound: bool = True


LOCAL_SETTINGS = Path(__file__).resolve().parents[2] / ".console-settings.json"


def load_settings() -> ConsoleSettings:
    values = (
        json.loads(LOCAL_SETTINGS.read_text(encoding="utf-8"))
        if LOCAL_SETTINGS.exists()
        else {}
    )
    return ConsoleSettings(**values)


def save_runtime_directory(directory: Path, bound: bool = True) -> None:
    temporary = LOCAL_SETTINGS.with_suffix(".tmp")
    temporary.write_text(
        json.dumps({"runtime_directory": str(directory), "runtime_bound": bound}, ensure_ascii=False),
        encoding="utf-8",
    )
    temporary.replace(LOCAL_SETTINGS)


settings = load_settings()

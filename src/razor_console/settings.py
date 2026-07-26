"""Console-owned settings.

These settings configure the Console service itself. Runtime tuning remains in
the Runtime TOML files and is intentionally not duplicated here.
"""

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
    runtime_directory: Path = Path(r"D:\Project\SuperAimBot")


settings = ConsoleSettings()

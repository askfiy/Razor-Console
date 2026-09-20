"""Locations for Console-owned writable state."""

import os
from pathlib import Path
import sys


def data_directory() -> Path:
    """Return a persistent writable directory for Console state."""
    if getattr(sys, "frozen", False):
        base = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
        directory = base / "RazorConsole"
        directory.mkdir(parents=True, exist_ok=True)
        return directory
    return Path(__file__).resolve().parents[2]

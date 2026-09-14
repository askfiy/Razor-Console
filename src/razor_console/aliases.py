"""Console-owned class names, shared by every browser and port."""
import json
from pathlib import Path
from threading import Lock

ALIAS_FILE = Path(__file__).resolve().parents[2] / ".console-aliases.json"
_lock = Lock()


def class_aliases(runtime: Path, profile: str, value=None, expected=None):
    key = str(runtime.resolve()).casefold()
    with _lock:
        all_values = json.loads(ALIAS_FILE.read_text(encoding="utf-8")) if ALIAS_FILE.exists() else {}
        current = all_values.get(key, {}).get(profile, {})
        if value is None:
            return current
        if expected is not None and expected != current:
            raise ValueError("别名已在其他页面修改，请重新打开配置后重试")
        all_values.setdefault(key, {})[profile] = value
        temporary = ALIAS_FILE.with_suffix(".tmp")
        temporary.write_text(json.dumps(all_values, ensure_ascii=False, indent=2), encoding="utf-8")
        temporary.replace(ALIAS_FILE)
        return value

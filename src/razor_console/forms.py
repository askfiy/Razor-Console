"""Lossless section drafts for the form UI. No Runtime imports or file writes."""

from __future__ import annotations

import re
from typing import Any

import tomlkit
from tomlkit.exceptions import ParseError

MARKER = "# razor-disabled: "
HEADER = re.compile(r"^\s*\[([A-Za-z_][\w.-]*)\]\s*(?:#.*)?$")


def _uncomment(line: str) -> str:
    if line.startswith(MARKER):
        return line[len(MARKER) :]
    return re.sub(r"^(\s*)# ?", r"\1", line, count=1)


def _table(document: Any, name: str) -> Any:
    for key in name.split("."):
        document = document[key]
    return document


def sections(content: str) -> list[dict[str, Any]]:
    """Recognize real headers only outside TOML multiline values/arrays."""
    lines = content.splitlines(keepends=True)
    starts: list[tuple[int, str, bool]] = []
    for index, line in enumerate(lines):
        disabled = line.lstrip().startswith("#")
        match = HEADER.fullmatch((_uncomment(line) if disabled else line).rstrip())
        if not match:
            continue
        # A valid prefix cannot end inside a multiline string or array.
        prefix = "".join(lines[:index])
        try:
            tomlkit.parse(prefix)
        except (ParseError, KeyError):
            continue
        if disabled and not (
            match[1].startswith("component.")
            or match[1] == "bridge"
            or match[1].startswith("device.")
        ):
            continue
        if line.startswith(MARKER) and starts and not starts[-1][2]:
            # A commented multiline rule can itself contain a header-looking line.
            previous_start = starts[-1][0]
            if lines[previous_start].startswith(MARKER):
                try:
                    tomlkit.parse(
                        "".join(
                            _uncomment(item) for item in lines[previous_start:index]
                        )
                    )
                except (ParseError, KeyError):
                    continue
        starts.append((index, match[1], not disabled))
    result = []
    for pos, (start, name, enabled) in enumerate(starts):
        end = starts[pos + 1][0] if pos + 1 < len(starts) else len(lines)
        if not enabled and not lines[start].startswith(MARKER):
            # Old templates separate the next section's prose with blank lines.
            # Leave that prose outside the disabled section instead of activating it.
            for boundary in range(start + 1, end - 1):
                if not lines[boundary].strip() and not lines[boundary + 1].strip():
                    try:
                        _table(
                            tomlkit.parse(
                                "".join(
                                    _uncomment(item) for item in lines[start:boundary]
                                )
                            ),
                            name,
                        )
                    except (ParseError, KeyError):
                        continue
                    end = boundary
                    break
        chunk = "".join(lines[start:end])
        raw = (
            chunk if enabled else "".join(_uncomment(line) for line in lines[start:end])
        )
        error = None
        data = {}
        try:
            data = _table(tomlkit.parse(raw), name).unwrap()
        except (ParseError, KeyError) as exc:
            error = str(exc)
        result.append(
            {
                "name": name,
                "enabled": enabled,
                "data": data,
                "raw": raw,
                "error": error,
                "start": start,
                "end": end,
            }
        )
    return result


def describe(content: str) -> dict[str, Any]:
    tomlkit.parse(content)
    return {"content": content, "sections": sections(content)}


def _merge(target: Any, values: dict[str, Any]) -> None:
    for key, value in values.items():
        if key in target and target[key] == value:
            continue
        if isinstance(value, dict) and key in target and hasattr(target[key], "keys"):
            _merge(target[key], value)
        elif (
            isinstance(value, list)
            and key in target
            and isinstance(target[key], list)
            and len(value) == len(target[key])
        ):
            for index, item in enumerate(value):
                if target[key][index] == item:
                    continue
                if isinstance(item, dict) and hasattr(target[key][index], "keys"):
                    if (
                        key == "class_priority"
                        and "label" not in item
                        and "label" in target[key][index]
                    ):
                        del target[key][index]["label"]
                    _merge(target[key][index], item)
                    if key == "conf_thresholds" and "dynamic_threshold" not in item:
                        target[key][index].pop("dynamic_threshold", None)
                else:
                    target[key][index] = item
        else:
            target[key] = value


def transform(content: str, changes: list[dict[str, Any]]) -> dict[str, Any]:
    tomlkit.parse(content)
    for change in changes:
        name = change["name"]
        if not re.fullmatch(r"[A-Za-z_][\w.-]*", name) or name == "search":
            raise ValueError("Unsupported section")
        entry = next((item for item in sections(content) if item["name"] == name), None)
        enabled = change.get("enabled", entry["enabled"] if entry else True)
        if (
            not enabled
            and not name.startswith("component.")
            and name != "bridge"
            and not name.startswith("device.")
        ):
            raise ValueError("Core sections cannot be disabled")
        raw = change.get("raw", entry["raw"] if entry else f"[{name}]\n")
        document = tomlkit.parse(raw)
        target = _table(document, name)
        # Raw editors may edit only their own section, never inject other sections.
        expected = tomlkit.document()
        cursor = expected
        for key in name.split(".")[:-1]:
            cursor[key] = tomlkit.table()
            cursor = cursor[key]
        cursor[name.split(".")[-1]] = target
        if expected.unwrap() != document.unwrap():
            raise ValueError("Raw TOML must contain only the selected section")
        _merge(target, change.get("data", {}))
        if "pattern" in change:
            pattern_doc = tomlkit.parse(change["pattern"])
            if set(pattern_doc) != {"pattern"} or not isinstance(
                pattern_doc["pattern"], list
            ):
                raise ValueError("Pattern editor must contain only pattern = [...]")
            target["pattern"] = pattern_doc["pattern"]
        new_raw = tomlkit.dumps(document)
        if not new_raw.endswith("\n"):
            new_raw += "\n"
        replacement = (
            new_raw
            if enabled
            else "".join(MARKER + line for line in new_raw.splitlines(keepends=True))
        )
        lines = content.splitlines(keepends=True)
        if entry:
            content = (
                "".join(lines[: entry["start"]])
                + replacement
                + "".join(lines[entry["end"] :])
            )
        else:
            content = content.rstrip() + "\n\n" + replacement
        tomlkit.parse(content)
    return describe(content)

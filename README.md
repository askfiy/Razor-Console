# Razor Console

Web-based configuration workspace and process supervisor for
[Razor Runtime](https://github.com/askfiy/Razor-Runtime).

Razor Console keeps Runtime tuning in the original TOML files instead of
maintaining a second configuration model. It can start and stop Runtime,
manage game profiles, display the rendered frame, play Runtime sound events,
and stream Runtime logs without writing a log file.

## Features

- Configure five always-on core modules: Render, Selector, Controller,
  Inference Engine, and Kalman Filter/Predictor.
- Use enum menus, synchronized sliders and editable numbers, and key chips
  with Add-to-capture and individual removal.
- Enable or disable optional `component.*` sections while preserving their
  settings and existing comments. Disabled settings remain editable.
- Edit Recoil `pattern` and the full SequenceAction section with TOML syntax
  highlighting, a selection-aware Comment / Uncomment button, and Ctrl+/ line
  toggling. Comment operations preserve the editor and panel scroll positions.
- Group multiple selector classes under the same label; include pickers exclude
  the class itself. Label buttons select all classes in that group.
- Define class aliases in the inference panel. Aliases replace class names in
  pickers and are stored per profile in this browser only, outside Runtime TOML.
- Choose an ONNX or TensorRT model with the native file chooser on the Console
  host. Engine choices are ONNX Runtime and TensorRT YOLO.
- Edit Visual Recoil HSV bounds in numeric H/S/V boxes, without sliders.
- Keep `search` hidden and untouched. Startup settings edit `boot.toml`;
  opening a game for editing does not change `system.loader`.
- Create, copy, select, save, and recoverably delete game profiles.
- Start and stop Razor Runtime as a separate process.
- Show the latest rendered frame, including a native `imgsz` view.
- Consume sound events and Runtime logs through the shared-memory Bridge.
- Edit details in a side panel and keep logs collapsed until needed.

## Editing and saving

Use **绑定 Runtime** to choose a Runtime root directory on the Console host.
The binding is saved in Console's `.console-settings.json`, overrides the
environment's Runtime directory, and survives Console restarts. Stop Runtime
and save or discard drafts before changing the binding.
The top-right status shows 未绑定 until a valid Runtime is configured, then
未启动 or Runtime 运行中. **解绑** persists the unbound state without deleting
Runtime files; it is available after stopping Runtime.

Each inference class has an optional dynamic threshold switch. Disabling it
removes `dynamic_threshold` so Runtime falls back to the normal threshold.

Parameter edits update a draft. Preview and functional component switches write
their changes immediately while preserving unrelated parameter drafts.
Runtime retains its Sound Alert playback. Console records received Bridge
events in the log without playing audio. Short preview gaps
retain the last decoded frame. Saving retains the open panel and its position.
Closing a side panel
with **×** adds its edits to that draft; **Save** (or Ctrl+S outside a panel) writes changed
files. External changes are checked before saving to avoid overwriting a newer
file. Boot and inference changes warn about Runtime restart behavior.

The form API, `POST /api/forms/draft`, transforms TOML in memory using
`tomlkit`. It performs no file writes. Existing configuration PUT endpoints
remain available and accept an optional `expected` original document for
conflict detection. Game files are saved before boot when both are changed;
the two files are not a single transaction, and an unsuccessful file stays dirty.

Add waits for keyboard, mouse-button, or wheel events received by the browser.
Existing extension tokens such as `<mouse-meta>` remain visible and removable;
hardware-side monitoring is not connected. New profiles copy a
saved existing profile so their required Runtime sections are present.

```powershell
uv run --with httpx python -m unittest tests_forms -v
node tests_editor.cjs
```

## Requirements

- Windows 10 or Windows 11
- Python 3.13
- [uv](https://docs.astral.sh/uv/)
- A local Razor Runtime checkout with its `.venv` already created

The shared-memory transport and the bundled Windows sound event mappings are
currently Windows-specific.

## Setup

```powershell
git clone https://github.com/askfiy/Razor-Console.git
cd Razor-Console
uv sync
Copy-Item .env.example .env
```

Edit `.env` so it points to your Runtime checkout:

```dotenv
RAZOR_CONSOLE_HOST=0.0.0.0
RAZOR_CONSOLE_PORT=8765
RAZOR_CONSOLE_RUNTIME_DIRECTORY=D:\Project\Razor\Razor-Runtime
```

Then start the service:

```powershell
uv run main.py
```

Open `http://127.0.0.1:8765/`.

## Runtime Bridge

Razor Runtime must enable its core Bridge in `boot.toml`:

```toml
[bridge]
transport = "shared_memory"
open_preview = false
```

The presence of the `[bridge]` section enables the Bridge. Comment out or
remove the complete section when Razor Console is not connected. While present,
the Bridge publishes these supported outputs:

- sound events
- Python logging records

Set `open_preview = true` to additionally publish final rendered frames.

There are no separate `frame` or `sound_events` switches. Runtime logs are
transported in memory and Razor Console does not create a Runtime log file.

`render.is_show` controls only the local OpenCV window. `bridge.open_preview`
controls external frame delivery independently without disabling sound events,
logging records, or Console stop requests.

## Process Model

Razor Console and Razor Runtime remain separate processes. Console launches
Runtime with the Python executable from the Runtime `.venv`, redirects no
output to disk, and uses the Bridge only for live output.

The configuration files in the Runtime checkout remain the single source of
truth. Deleted game profiles are moved to `.razor-trash` inside the Runtime
directory so they can be recovered manually.

## Health Check

```text
GET /api/health
```

The response includes the configured Runtime directory and whether it exists.

## License

Educational and research purposes only.

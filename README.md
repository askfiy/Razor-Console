# Razor Console

Web-based process supervisor and raw TOML editor for
[Razor Runtime](https://github.com/askfiy/Razor-Runtime).

Razor Console keeps Runtime tuning in the original TOML files instead of
maintaining a second configuration model. It can start and stop Runtime,
manage game profiles, display the rendered frame, play Runtime sound events,
and stream Runtime logs without writing a log file.

## Features

- Edit `boot.toml` and `config/*.toml` with TOML highlighting.
- Comment or uncomment the selected lines with one action or `Ctrl+/`.
- Create, copy, select, save, and recoverably delete game profiles.
- Start and stop Razor Runtime as a separate process.
- Show the latest rendered frame, including a native `imgsz` view.
- Consume sound events and Runtime logs through the shared-memory Bridge.
- Keep long configuration files and output panels inside a `100vh` layout
  with independent scroll areas.

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
enabled = true
transport = "shared_memory"
```

When enabled, the Bridge publishes all supported outputs:

- final rendered frames
- sound events
- Python logging records

There are no separate `frame` or `sound_events` switches. Runtime logs are
transported in memory and Razor Console does not create a Runtime log file.

`render.is_show` controls only the local OpenCV window. `bridge.enabled`
controls external frame delivery independently.

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

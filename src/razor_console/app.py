"""FastAPI application factory."""

import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .services import ConfigStore, RuntimeProcess, SharedBridgeReader
from .settings import ConsoleSettings, settings


class ConfigContent(BaseModel):
    """Raw TOML payload."""

    content: str


class CreateGameConfig(BaseModel):
    """Create-game request."""

    name: str
    source: str | None = None


def create_app(console_settings: ConsoleSettings | None = None) -> FastAPI:
    """Create an isolated Razor Console application instance."""
    active_settings = console_settings or settings
    app = FastAPI(
        title="Razor Console",
        description="Control console for an independently runnable Razor Runtime.",
        version="0.1.0",
    )
    app.state.settings = active_settings
    config_store = ConfigStore(active_settings.runtime_directory)
    runtime_process = RuntimeProcess(active_settings.runtime_directory)
    bridge_reader = SharedBridgeReader()

    @app.middleware("http")
    async def disable_console_asset_cache(request: Request, call_next):
        response = await call_next(request)
        if not request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.on_event("shutdown")
    async def close_bridge_reader() -> None:
        bridge_reader.close()

    @app.get("/api/health", tags=["system"])
    async def health() -> dict[str, Any]:
        runtime_directory = active_settings.runtime_directory.resolve()
        return {
            "status": "ok",
            "service": "razor-console",
            "runtime": {
                "directory": str(runtime_directory),
                "exists": runtime_directory.is_dir(),
            },
        }

    @app.get("/api/configs", tags=["configuration"])
    async def list_configs() -> dict[str, Any]:
        try:
            return config_store.summary()
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    @app.get("/api/config/boot", tags=["configuration"])
    async def get_boot_config() -> dict[str, str]:
        try:
            return {"name": "boot.toml", "content": config_store.read_boot()}
        except OSError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    @app.put("/api/config/boot", tags=["configuration"])
    async def save_boot_config(payload: ConfigContent) -> dict[str, str]:
        try:
            config_store.save_boot(payload.content)
            return {"status": "saved", "name": "boot.toml"}
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.get("/api/config/game/{name}", tags=["configuration"])
    async def get_game_config(name: str) -> dict[str, str]:
        try:
            return {
                "name": f"{name.removesuffix('.toml')}.toml",
                "content": config_store.read_game(name),
            }
        except (FileNotFoundError, ValueError) as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    @app.put("/api/config/game/{name}", tags=["configuration"])
    async def save_game_config(
        name: str, payload: ConfigContent
    ) -> dict[str, str]:
        try:
            config_store.save_game(name, payload.content)
            return {"status": "saved", "name": f"{name.removesuffix('.toml')}.toml"}
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.post("/api/config/game", tags=["configuration"])
    async def create_game_config(payload: CreateGameConfig) -> dict[str, str]:
        try:
            name = config_store.create_game(payload.name, payload.source)
            return {"status": "created", "name": name}
        except FileExistsError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.delete("/api/config/game/{name}", tags=["configuration"])
    async def delete_game_config(name: str) -> dict[str, str]:
        try:
            trash_path = config_store.delete_game(name)
            return {
                "status": "deleted",
                "name": name.removesuffix(".toml"),
                "recovery": str(trash_path),
            }
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    @app.get("/api/runtime", tags=["runtime"])
    async def runtime_status() -> dict[str, Any]:
        return runtime_process.status()

    @app.post("/api/runtime/start", tags=["runtime"])
    async def start_runtime() -> dict[str, Any]:
        try:
            return runtime_process.start()
        except RuntimeError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    @app.post("/api/runtime/stop", tags=["runtime"])
    async def stop_runtime() -> dict[str, Any]:
        graceful_requested = bridge_reader.request_runtime_stop()
        return runtime_process.stop(graceful_requested=graceful_requested)

    sound_files = {
        "startup": "Windows Proximity Notification.wav",
        "stop": "Speech Off.wav",
        "pause": "Speech Off.wav",
        "resume": "Speech On.wav",
        "active": "Speech Sleep.wav",
        "inactive": "Speech Misrecognition.wav",
        "label": "Windows Exclamation.wav",
        "reload": "Notify.wav",
    }

    @app.get("/api/sound/{event}", tags=["sound"])
    async def play_sound_file(event: str) -> FileResponse:
        filename = sound_files.get(event)
        if not filename:
            raise HTTPException(status_code=404, detail="Unknown sound event")
        system_root = Path(os.environ.get("SystemRoot", r"C:\Windows"))
        candidates = [
            system_root / "Media" / filename,
            system_root / "Media" / "Speech" / filename,
        ]
        for candidate in candidates:
            if candidate.is_file():
                return FileResponse(candidate, media_type="audio/wav")
        raise HTTPException(status_code=404, detail=f"Sound file not found: {filename}")

    @app.get("/api/frame", tags=["frame"])
    async def latest_frame() -> Response:
        frame = bridge_reader.read_frame()
        if frame is None:
            return Response(status_code=204)
        return Response(
            content=frame,
            media_type="image/jpeg",
            headers={"Cache-Control": "no-store"},
        )

    @app.get("/api/bridge/events", tags=["bridge"])
    async def bridge_events() -> dict[str, list[dict[str, Any]]]:
        return {"events": bridge_reader.read_sound_events()}

    def read_runtime_logs(
        after: int | None = None,
    ) -> dict[str, Any]:
        process_logs = runtime_process.read_logs(after)
        bridge_logs = bridge_reader.read_logs(after)
        if runtime_process.has_managed_session:
            return {
                "generation": runtime_process.log_generation,
                "logs": process_logs,
            }
        return {"generation": 0, "logs": bridge_logs}

    @app.get("/api/bridge/logs", tags=["bridge"])
    async def bridge_logs() -> dict[str, Any]:
        # Compatibility route for pages loaded before Runtime process-output
        # capture was introduced.
        return read_runtime_logs()

    @app.get("/api/runtime/logs", tags=["runtime"])
    async def runtime_logs(after: int = 0) -> dict[str, Any]:
        return read_runtime_logs(after)

    @app.post("/api/runtime/logs/clear", tags=["runtime"])
    async def clear_runtime_logs() -> dict[str, int]:
        if runtime_process.has_managed_session:
            return {
                "generation": runtime_process.log_generation,
                "sequence": runtime_process.clear_logs(),
            }
        return {
            "generation": 0,
            "sequence": bridge_reader.clear_logs(),
        }

    static_directory = Path(__file__).with_name("static")
    app.mount(
        "/",
        StaticFiles(directory=static_directory, html=True),
        name="console",
    )

    return app


app = create_app()

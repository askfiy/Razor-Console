import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import PropertyMock, patch

from fastapi.testclient import TestClient

from razor_console.app import create_app
from razor_console.services import RuntimeProcess, SharedBridgeReader, _FRAME_HEADER
from razor_console.settings import ConsoleSettings


class OutputTests(unittest.TestCase):
    def test_frame_endpoint_does_not_replay_shared_frame_after_runtime_stops(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "config").mkdir()
            (root / "main.py").write_text("")
            (root / "boot.toml").write_text('[system]\nloader="game"\n')
            with (
                patch.object(RuntimeProcess, "running", new_callable=PropertyMock) as running,
                patch.object(SharedBridgeReader, "read_frame", return_value=b"jpeg") as read_frame,
                TestClient(create_app(ConsoleSettings(runtime_directory=root))) as client,
            ):
                running.return_value = True
                response = client.get("/api/frame")
                self.assertEqual(response.content, b"jpeg")
                self.assertEqual(response.headers["x-runtime-running"], "true")
                self.assertEqual(response.headers["cache-control"], "no-store")
                read_frame.reset_mock()
                running.return_value = False
                response = client.get("/api/frame")
                self.assertEqual(response.status_code, 204)
                self.assertEqual(response.content, b"")
                self.assertEqual(response.headers["x-runtime-running"], "false")
                self.assertEqual(response.headers["cache-control"], "no-store")
                read_frame.assert_not_called()
                running.return_value = True
                read_frame.return_value = None
                response = client.get("/api/frame")
                self.assertEqual(response.status_code, 204)
                self.assertEqual(response.headers["x-runtime-running"], "true")

    def test_reload_discards_old_logs_but_preserves_new_cycle(self):
        process = RuntimeProcess(Path('.'))
        process._append_log(20, 'previous session')
        generation = process.log_generation
        marker = 'INFO: [time] [src.reload] - [check_changes:125] - Configuration file change detected, reloading...'
        process._append_log(20, marker)
        process._append_log(20, 'Reloaded player')
        self.assertEqual(process.log_generation, generation + 1)
        self.assertEqual([row['text'] for row in process.read_logs(0)], [marker, 'Reloaded player'])

    def test_bridge_returns_events_without_playback_instructions(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "config").mkdir()
            (root / "main.py").write_text("")
            (root / "boot.toml").write_text('[system]\nloader="game"\n')
            app = create_app(ConsoleSettings(runtime_directory=root))
            events = [{"sequence": 1, "name": "startup"}]
            with patch.object(SharedBridgeReader, "read_sound_events", return_value=events), TestClient(app) as client:
                self.assertEqual(client.get("/api/bridge/events").json(), {"events": events})
    def test_frame_reader_retries_busy_header(self):
        reader = SharedBridgeReader.__new__(SharedBridgeReader)
        reader._frame_max_age_ns = 2_000_000_000
        reader._frame_mapping = bytes(_FRAME_HEADER.size) + b"jpeg"
        header = (2, time.time_ns(), 4)
        with patch("razor_console.services._FRAME_HEADER") as mocked:
            mocked.size = _FRAME_HEADER.size
            mocked.unpack_from.side_effect = [(1, 0, 0), header, header]
            self.assertEqual(reader.read_frame(), b"jpeg")

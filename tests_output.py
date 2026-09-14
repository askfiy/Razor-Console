import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from razor_console.app import create_app
from razor_console.services import SharedBridgeReader, _FRAME_HEADER
from razor_console.settings import ConsoleSettings


class OutputTests(unittest.TestCase):
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

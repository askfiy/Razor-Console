import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import tomlkit
from fastapi.testclient import TestClient

from razor_console.app import create_app
from razor_console.forms import transform
from razor_console.settings import ConsoleSettings, load_settings


class BindingTests(unittest.TestCase):
    def test_bind_persists_and_switches_workspace(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in ("old", "new"):
                directory = root / name
                (directory / "config").mkdir(parents=True)
                (directory / "boot.toml").write_text('[system]\nloader="game"\n')
                (directory / "config/game.toml").write_text(
                    '[inferencer]\nengine="OnnxRuntime"\n'
                )
                (directory / "main.py").write_text("")
            local = root / "console.json"
            with (
                patch("razor_console.settings.LOCAL_SETTINGS", local),
                patch("razor_console.app.choose_runtime", return_value=root / "new"),
            ):
                with TestClient(
                    create_app(ConsoleSettings(runtime_directory=root / "old"))
                ) as client:
                    response = client.post("/api/runtime/bind")
                    self.assertEqual(response.status_code, 200, response.text)
                    self.assertEqual(
                        Path(client.get("/api/health").json()["runtime"]["directory"]),
                        root / "new",
                    )
                    self.assertEqual(load_settings().runtime_directory, root / "new")

                    self.assertTrue(client.get("/api/runtime").json()["bound"])
                    self.assertEqual(client.post("/api/runtime/unbind").status_code, 200)
                    self.assertFalse(client.get("/api/runtime").json()["bound"])
                    self.assertFalse(load_settings().runtime_bound)
                    self.assertEqual(client.post("/api/runtime/start").status_code, 409)
                    self.assertEqual(client.get("/api/configs").status_code, 409)
                    self.assertTrue((root / "new/boot.toml").exists())
                    self.assertEqual(client.post("/api/runtime/bind").status_code, 200)
                    self.assertTrue(load_settings().runtime_bound)
                    with patch("razor_console.app.choose_runtime", return_value=root):
                        self.assertEqual(
                            client.post("/api/runtime/bind").status_code, 400
                        )
                    with patch("razor_console.app.choose_runtime", return_value=None):
                        self.assertIsNone(
                            client.post("/api/runtime/bind").json()["path"]
                        )
                    self.assertEqual(load_settings().runtime_directory, root / "new")

    def test_dynamic_threshold_can_be_disabled_and_restored(self):
        content = "[inferencer]\nconf_thresholds=[{class_id=0,threshold=0.4,dynamic_threshold=0.2}]\n"
        row = {"class_id": 0, "threshold": 0.4}
        result = transform(
            content, [{"name": "inferencer", "data": {"conf_thresholds": [row]}}]
        )["content"]
        self.assertNotIn(
            "dynamic_threshold",
            tomlkit.parse(result)["inferencer"]["conf_thresholds"][0],
        )
        row["dynamic_threshold"] = 0.3
        result = transform(
            result, [{"name": "inferencer", "data": {"conf_thresholds": [row]}}]
        )["content"]
        self.assertEqual(
            tomlkit.parse(result)["inferencer"]["conf_thresholds"][0][
                "dynamic_threshold"
            ],
            0.3,
        )

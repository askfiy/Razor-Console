import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from razor_console.model_picker import choose_model


class ModelPickerTests(unittest.TestCase):
    def test_selected_model_returns_runtime_relative_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "models").mkdir()
            model = root / "models/model.onnx"
            model.write_bytes(b"test")
            with patch(
                "razor_console.model_picker.subprocess.run",
                return_value=subprocess.CompletedProcess([], 0, str(model) + "\n", ""),
            ):
                self.assertEqual(choose_model(root), "./models/model.onnx")

    def test_cancel_leaves_model_unselected(self):
        with patch(
            "razor_console.model_picker.subprocess.run",
            return_value=subprocess.CompletedProcess([], 0, "\n", ""),
        ):
            self.assertIsNone(choose_model(Path(".")))

    def test_unsupported_file_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "file.txt"
            path.write_text("test")
            with (
                patch(
                    "razor_console.model_picker.subprocess.run",
                    return_value=subprocess.CompletedProcess([], 0, str(path), ""),
                ),
                self.assertRaises(ValueError),
            ):
                choose_model(Path(tmp))

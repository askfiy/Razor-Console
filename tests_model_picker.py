import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from razor_console.model_picker import choose_model, choose_runtime


class ModelPickerTests(unittest.TestCase):
    def test_frozen_picker_returns_directory_without_desktop_arguments(self):
        with tempfile.TemporaryDirectory() as tmp:
            selected = Path(tmp) / "运行目录"
            selected.mkdir()

            def child(args, **kwargs):
                self.assertEqual(args[1], "--native-picker")
                self.assertEqual(args[3], "directory")
                Path(args[-1]).write_text(str(selected), encoding="utf-8")
                return subprocess.CompletedProcess(args, 0)

            with patch("razor_console.model_picker.sys.frozen", True, create=True), patch(
                "razor_console.model_picker.subprocess.run", side_effect=child
            ):
                self.assertEqual(choose_runtime(Path(tmp)), selected.resolve())

    def test_frozen_model_picker_uses_file_result_and_handles_cancel(self):
        with tempfile.TemporaryDirectory() as tmp:
            model = Path(tmp) / "模型.onnx"
            model.write_bytes(b"test")
            selections = iter([str(model), ""])

            def child(args, **kwargs):
                self.assertEqual(args[1], "--native-picker")
                self.assertEqual(args[3], "model")
                Path(args[-1]).write_text(next(selections), encoding="utf-8")
                return subprocess.CompletedProcess(args, 0)

            with patch("razor_console.model_picker.sys.frozen", True, create=True), patch(
                "razor_console.model_picker.subprocess.run", side_effect=child
            ):
                self.assertEqual(choose_model(Path(tmp)), "./模型.onnx")
                self.assertIsNone(choose_model(Path(tmp)))

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

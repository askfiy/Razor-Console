import tempfile
import unittest
from pathlib import Path

import tomlkit

from razor_console.forms import transform
from razor_console.services import ConfigStore


class FormTests(unittest.TestCase):
    def test_controller_three_decimal_gains_round_trip(self):
        gains = {f"{gain}_{axis}": 0.075 for gain in ("kp", "ki", "kd", "kf") for axis in ("x", "y")}
        original = "[controller]\n" + "".join(f"{key} = 0.1\n" for key in gains)
        result = transform(original, [{"name": "controller", "data": gains}])
        self.assertEqual(dict(tomlkit.parse(result["content"])["controller"]), gains)
        self.assertEqual(result["sections"][0]["data"], gains)

    def test_recoil_comment_groups_round_trip(self):
        content = "[component.RecoilComponent]\npattern = [\n # default\n [0.1, 0, 8],\n # k416\n # [0.1, 2, 4],\n]\n"
        pattern = "pattern = [\n # default\n # [0.1, 0, 8],\n # k416\n [0.1, 2, 4],\n]"
        result = transform(content, [{"name": "component.RecoilComponent", "pattern": pattern}])
        section = result["sections"][0]
        self.assertEqual(section["data"]["pattern"], [[0.1, 2, 4]])
        self.assertIn("# default", section["raw"])
        self.assertIn("# [0.1, 0, 8]", section["raw"])
        self.assertIn("# k416", section["raw"])
        self.assertNotIn("profiles", section["data"])

    def test_class_label_can_be_added_changed_and_removed_without_changing_ids(self):
        content = "[selector]\nclass_priority = [\n # keep\n {class_id=0, priority=3, include=[1]},\n]\n"
        row = {"class_id": 0, "priority": 3, "include": [1], "label": "enemy"}
        result = transform(
            content, [{"name": "selector", "data": {"class_priority": [row]}}]
        )["content"]
        self.assertEqual(
            tomlkit.parse(result)["selector"]["class_priority"][0]["label"], "enemy"
        )
        del row["label"]
        result = transform(
            result, [{"name": "selector", "data": {"class_priority": [row]}}]
        )["content"]
        self.assertNotIn(
            "label", tomlkit.parse(result)["selector"]["class_priority"][0]
        )
        self.assertIn("# keep", result)
        self.assertEqual(
            tomlkit.parse(result)["selector"]["class_priority"][0]["class_id"], 0
        )

    def setUp(self):
        self.content = '''# heading
[search]
components = ["./custom"] # preserve
[controller]
kp_x = 0.18 # tuning
[component.RecoilComponent]
activation_keys = ["<mouse-left>"]
pattern = [
 # preset remains
 [0.1, 0, 8],
 # [0.2, 1, 9],
]
[component.SequenceActionComponent]
rule = """
# untouched script
[component.ScriptLiteral]
$action:<q>$
"""
'''

    def test_edit_preserves_unrelated_sections_comments_and_script(self):
        result = transform(
            self.content, [{"name": "controller", "data": {"kp_x": 0.21}}]
        )["content"]
        self.assertEqual(result, self.content.replace("kp_x = 0.18", "kp_x = 0.21"))

    def test_toggle_is_exactly_reversible(self):
        for name in ["component.RecoilComponent", "component.SequenceActionComponent"]:
            off = transform(self.content, [{"name": name, "enabled": False}])["content"]
            self.assertNotIn(name.split(".")[-1], tomlkit.parse(off)["component"])
            restored = transform(off, [{"name": name, "enabled": True}])["content"]
            self.assertEqual(restored, self.content)

    def test_keys_preserve_raw_pattern(self):
        result = transform(
            self.content,
            [
                {
                    "name": "component.RecoilComponent",
                    "data": {"activation_keys": ["<f8>"]},
                }
            ],
        )["content"]
        self.assertEqual(result, self.content.replace("<mouse-left>", "<f8>"))

    def test_legacy_disabled_section_and_default_component(self):
        text = "[player]\naiming_button = []\n# [component.FovComponent]\n# # keep note\n# active_percent = 0.5\n"
        result = transform(text, [{"name": "component.FovComponent", "enabled": True}])[
            "content"
        ]
        self.assertIn("# keep note", result)
        self.assertEqual(
            tomlkit.parse(result)["component"]["FovComponent"]["active_percent"], 0.5
        )
        result = transform(
            result, [{"name": "component.SoundAlertComponent", "enabled": True}]
        )["content"]
        self.assertIn("SoundAlertComponent", tomlkit.parse(result)["component"])

    def test_only_selected_section_can_be_edited(self):
        for change in [
            {"name": "controller", "enabled": False},
            {"name": "search", "data": {"x": 1}},
            {
                "name": "controller",
                "raw": '[controller]\nkp_x=1\n[system]\nloader="x"\n',
            },
        ]:
            with self.assertRaises(ValueError):
                transform(self.content, [change])

    def test_pattern_only_and_toml_validation(self):
        result = transform(
            self.content,
            [
                {
                    "name": "component.RecoilComponent",
                    "pattern": "pattern = [\n # custom\n [0.2, 1, 2]\n]",
                }
            ],
        )["content"]
        self.assertIn("# custom", result)
        for pattern in ["pattern = [", "pattern=[]\nother=1"]:
            with self.assertRaises(ValueError):
                transform(
                    self.content,
                    [{"name": "component.RecoilComponent", "pattern": pattern}],
                )

    def test_atomic_store_uses_actual_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "config").mkdir()
            (root / "main.py").write_text("")
            (root / "boot.toml").write_text('[system]\nloader="one"\n')
            (root / "main.py").write_text("")
            (root / "config/one.toml").write_text(self.content)
            store = ConfigStore(root)
            updated = transform(
                store.read_game("one"), [{"name": "controller", "data": {"kp_x": 0.25}}]
            )["content"]
            store.save_game("one", updated)
            self.assertEqual(store.read_game("one"), updated)
            with self.assertRaises(ValueError):
                store.save_game("one", "[invalid")
            self.assertEqual(store.read_game("one"), updated)


class ApiTests(unittest.TestCase):
    def test_draft_save_conflict_and_invalid_file(self):
        from fastapi.testclient import TestClient

        from razor_console.app import create_app
        from razor_console.settings import ConsoleSettings

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "config").mkdir()
            (root / "boot.toml").write_text('[system]\nloader="one"\n')
            (root / "config/one.toml").write_text("[player]\naiming_button=[]\n")
            (root / "main.py").write_text("")
            with TestClient(
                create_app(ConsoleSettings(runtime_directory=root))
            ) as client:
                old = client.get("/api/config/game/one").json()["content"]
                draft = client.post(
                    "/api/forms/draft",
                    json={
                        "content": old,
                        "changes": [
                            {"name": "player", "data": {"aiming_button": ["<f8>"]}}
                        ],
                    },
                )
                self.assertEqual(draft.status_code, 200, draft.text)
                new = draft.json()["content"]
                self.assertEqual(
                    client.put(
                        "/api/config/game/one", json={"content": new, "expected": old}
                    ).status_code,
                    200,
                )
                self.assertEqual(
                    client.get("/api/config/game/one").json()["content"], new
                )
                self.assertEqual(
                    client.put(
                        "/api/config/game/one", json={"content": old, "expected": old}
                    ).status_code,
                    409,
                )
                self.assertEqual(
                    client.put(
                        "/api/config/game/one",
                        json={"content": "[invalid", "expected": new},
                    ).status_code,
                    400,
                )
                self.assertEqual(
                    client.get("/api/config/game/one").json()["content"], new
                )
                self.assertEqual(client.get("/").status_code, 200)


if __name__ == "__main__":
    unittest.main()

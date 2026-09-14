import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from razor_console.aliases import class_aliases

class AliasTests(unittest.TestCase):
    def test_persistence_isolation_and_conflicts(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            with patch('razor_console.aliases.ALIAS_FILE', root / 'aliases.json'):
                self.assertEqual(class_aliases(root, 'csgo'), {})
                class_aliases(root, 'csgo', {'0': 'head'}, {})
                self.assertEqual(class_aliases(root, 'csgo'), {'0': 'head'})
                self.assertEqual(class_aliases(root, 'other'), {})
                self.assertEqual(class_aliases(root / 'other', 'csgo'), {})
                with self.assertRaises(ValueError):
                    class_aliases(root, 'csgo', {'0': 'body'}, {})
                class_aliases(root, 'csgo', {}, {'0': 'head'})
                self.assertEqual(class_aliases(root, 'csgo'), {})

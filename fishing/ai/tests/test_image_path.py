import tempfile
import unittest
from pathlib import Path

from app.image_path import resolve_image_path


class ResolveImagePathTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.image = self.root / "bass.jpg"
        self.image.write_bytes(b"fake")
        outside = self.root.parent / "outside-secret.jpg"
        outside.write_bytes(b"secret")
        self.addCleanup(outside.unlink, missing_ok=True)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_allows_file_inside_uploads(self) -> None:
        resolved = resolve_image_path("/uploads/bass.jpg", self.root)
        self.assertEqual(resolved, self.image.resolve())

    def test_rejects_parent_traversal(self) -> None:
        with self.assertRaises(ValueError):
            resolve_image_path("/uploads/../outside-secret.jpg", self.root)

    def test_rejects_nested_traversal(self) -> None:
        with self.assertRaises(ValueError):
            resolve_image_path("/uploads/foo/../../outside-secret.jpg", self.root)

    def test_rejects_absolute_filesystem_path(self) -> None:
        with self.assertRaises(ValueError):
            resolve_image_path(str(self.image), self.root)

    def test_missing_file(self) -> None:
        with self.assertRaises(FileNotFoundError):
            resolve_image_path("/uploads/missing.jpg", self.root)


if __name__ == "__main__":
    unittest.main()

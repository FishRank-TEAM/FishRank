import unittest

from app.production_guard import assert_production_secret, runtime_env


class ProductionGuardTest(unittest.TestCase):
    def test_dev_allows_default_secret(self) -> None:
        assert_production_secret("development", "fishrank_ai_internal_secret")
        assert_production_secret(None, "")

    def test_production_rejects_default_secret(self) -> None:
        with self.assertRaises(RuntimeError):
            assert_production_secret("production", "fishrank_ai_internal_secret")
        with self.assertRaises(RuntimeError):
            assert_production_secret(" production ", "  ")

    def test_production_allows_custom_secret(self) -> None:
        assert_production_secret("production", "rotated-internal-secret")

    def test_runtime_env_prefers_node_env(self) -> None:
        self.assertEqual(runtime_env({"NODE_ENV": "Production", "ENV": "dev"}), "production")
        self.assertEqual(runtime_env({"ENVIRONMENT": "production"}), "production")


if __name__ == "__main__":
    unittest.main()

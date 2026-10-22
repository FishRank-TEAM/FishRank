import unittest

from app.runtime_tuning import prepare_process_threads, torch_num_threads, warmup_enabled


class RuntimeTuningTest(unittest.TestCase):
    def test_dev_warmup_defaults_off(self) -> None:
        self.assertFalse(warmup_enabled({}))
        self.assertFalse(warmup_enabled({"NODE_ENV": "development"}))
        self.assertFalse(warmup_enabled({"AI_WARMUP": ""}))

    def test_production_warmup_defaults_on(self) -> None:
        self.assertTrue(warmup_enabled({"NODE_ENV": "production"}))
        self.assertTrue(warmup_enabled({"ENV": "Production"}))
        self.assertTrue(warmup_enabled({"ENVIRONMENT": "production"}))

    def test_explicit_warmup_flag_wins(self) -> None:
        self.assertFalse(warmup_enabled({"NODE_ENV": "production", "AI_WARMUP": "false"}))
        self.assertFalse(warmup_enabled({"AI_WARMUP": "0"}))
        self.assertFalse(warmup_enabled({"AI_WARMUP": "no"}))
        self.assertFalse(warmup_enabled({"AI_WARMUP": "off"}))
        self.assertTrue(warmup_enabled({"AI_WARMUP": "true"}))
        self.assertTrue(warmup_enabled({"AI_WARMUP": " YES "}))
        self.assertTrue(warmup_enabled({"NODE_ENV": "development", "AI_WARMUP": "1"}))

    def test_torch_threads_default_small_in_dev(self) -> None:
        self.assertEqual(torch_num_threads({}), 1)
        self.assertEqual(torch_num_threads({"NODE_ENV": "development"}), 1)
        self.assertEqual(torch_num_threads({"TORCH_NUM_THREADS": "2"}), 2)
        self.assertEqual(torch_num_threads({"TORCH_NUM_THREADS": "0"}), 1)
        self.assertEqual(torch_num_threads({"TORCH_NUM_THREADS": "nope"}), 1)

    def test_production_does_not_cap_threads_unless_asked(self) -> None:
        self.assertIsNone(torch_num_threads({"NODE_ENV": "production"}))
        self.assertEqual(
            torch_num_threads({"NODE_ENV": "production", "TORCH_NUM_THREADS": "4"}),
            4,
        )

    def test_prepare_keeps_existing_omp_and_skips_production(self) -> None:
        updates = prepare_process_threads({"TORCH_NUM_THREADS": "1", "OMP_NUM_THREADS": "8"})
        self.assertNotIn("OMP_NUM_THREADS", updates)
        self.assertEqual(updates["MKL_NUM_THREADS"], "1")
        self.assertEqual(updates["OPENBLAS_NUM_THREADS"], "1")
        self.assertEqual(prepare_process_threads({"NODE_ENV": "production"}), {})


if __name__ == "__main__":
    unittest.main()

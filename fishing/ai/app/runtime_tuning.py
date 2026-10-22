"""Dev-safe model startup. Production defaults stay eager and uncapped."""

from __future__ import annotations

import os

from .production_guard import runtime_env

_TRUE = {"1", "true", "yes", "on"}
_THREAD_ENV_KEYS = ("OMP_NUM_THREADS", "MKL_NUM_THREADS", "OPENBLAS_NUM_THREADS")


def _raw(source: dict[str, str], key: str) -> str | None:
    value = source.get(key)
    if value is None:
        return None
    text = str(value).strip()
    if text == "":
        return None
    return text


def _truthy(value: str) -> bool:
    return value.strip().lower() in _TRUE


def warmup_enabled(environ: dict[str, str] | None = None) -> bool:
    """YOLO weights load at startup only when this is true.

    Unset follows the process environment: production warms up, everything else
    waits for the first inference request. AI_WARMUP always wins when set.
    """
    source = environ if environ is not None else os.environ
    raw = _raw(source, "AI_WARMUP")
    if raw is None:
        return runtime_env(source) == "production"
    return _truthy(raw)


def torch_num_threads(environ: dict[str, str] | None = None) -> int | None:
    """Thread cap passed to torch.set_num_threads.

    None means leave PyTorch's default alone (production). Dev defaults to 1.
    TORCH_NUM_THREADS overrides both.
    """
    source = environ if environ is not None else os.environ
    raw = _raw(source, "TORCH_NUM_THREADS")
    if raw is not None:
        try:
            return max(1, int(raw))
        except ValueError:
            return 1
    if runtime_env(source) == "production":
        return None
    return 1


def prepare_process_threads(environ: dict[str, str] | None = None) -> dict[str, str]:
    """Set OpenMP/BLAS thread env before native libraries load.

    When environ is passed, nothing is written to os.environ (tests).
    Existing values are kept.
    """
    source = environ if environ is not None else os.environ
    count = torch_num_threads(source)
    if count is None:
        return {}
    updates: dict[str, str] = {}
    for key in _THREAD_ENV_KEYS:
        if _raw(source, key) is None:
            updates[key] = str(count)
    if environ is None:
        os.environ.update(updates)
    return updates


def apply_torch_thread_cap() -> int | None:
    """Cap torch threads on the dev model-load path. No-op in production."""
    count = torch_num_threads()
    if count is None:
        return None
    prepare_process_threads()
    try:
        import torch
    except ImportError:
        return count
    torch.set_num_threads(count)
    try:
        torch.set_num_interop_threads(1)
    except RuntimeError:
        pass
    return count

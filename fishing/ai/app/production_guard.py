from __future__ import annotations

DEFAULT_INTERNAL_SECRET = "fishrank_ai_internal_secret"


def runtime_env(environ: dict[str, str] | None = None) -> str:
    source = environ if environ is not None else __import__("os").environ
    return (
        source.get("NODE_ENV")
        or source.get("ENV")
        or source.get("ENVIRONMENT")
        or ""
    ).strip().lower()


def assert_production_secret(env: str | None, secret: str | None) -> None:
    if (env or "").strip().lower() != "production":
        return
    value = (secret or "").strip()
    if not value or value == DEFAULT_INTERNAL_SECRET:
        raise RuntimeError(
            "운영 환경에서는 INTERNAL_SECRET을 기본값이 아닌 값으로 설정해야 합니다."
        )

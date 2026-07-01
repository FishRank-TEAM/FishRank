from fastapi import Header, HTTPException

from .config import settings


def verify_internal_secret(x_internal_secret: str | None = Header(default=None)) -> None:
    if not x_internal_secret or x_internal_secret != settings.internal_secret:
        raise HTTPException(status_code=401, detail="Invalid internal secret")

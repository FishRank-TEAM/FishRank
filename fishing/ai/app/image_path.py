from __future__ import annotations

from pathlib import Path


def resolve_image_path(image_url: str, uploads_path: Path) -> Path:
    """업로드 디렉터리 안의 파일만 연다. 절대 경로와 .. 탈출은 거절한다."""
    if image_url.startswith("s3://"):
        raise NotImplementedError("S3 이미지는 로컬 개발 환경에서 아직 지원하지 않습니다.")

    if not image_url.startswith("/uploads/"):
        raise ValueError("허용되지 않은 이미지 경로입니다.")

    relative = image_url.removeprefix("/uploads/").replace("\\", "/")
    if not relative or relative.startswith("/") or ".." in Path(relative).parts:
        raise ValueError("허용되지 않은 이미지 경로입니다.")

    root = uploads_path.resolve()
    candidate = (root / relative).resolve()
    if not candidate.is_relative_to(root):
        raise ValueError("허용되지 않은 이미지 경로입니다.")
    if not candidate.is_file():
        raise FileNotFoundError(f"이미지를 찾을 수 없습니다: {image_url}")
    return candidate

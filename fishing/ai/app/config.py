from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8000
    internal_secret: str = "fishrank_ai_internal_secret"
    uploads_dir: str = "../apps/api/uploads"
    species_confidence_s_threshold: float = 0.7
    species_classifier: str = "auto"  # auto | yolo | clip | hsv
    clip_model_name: str = "openai/clip-vit-base-patch32"
    clip_device: str = "cpu"  # cpu | cuda
    clip_min_score: float = 0.08
    yolo_model_path: str = "models/fish_classifier/weights/best.pt"
    yolo_min_confidence: float = 0.35
    yolo_imgsz: int = 224

    @property
    def uploads_path(self) -> Path:
        base = Path(__file__).resolve().parent.parent
        return (base / self.uploads_dir).resolve()


settings = Settings()

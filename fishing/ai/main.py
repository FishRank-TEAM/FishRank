from fastapi import Depends, FastAPI, HTTPException

from app.analyzer import analyze_image
from app.auth import verify_internal_secret
from app.config import settings
from app.schemas import AnalyzeRequest, AnalyzeResponse, HealthResponse
from app.species_yolo import INFERENCE_VERSION, get_yolo_class_count, is_yolo_available, warmup_yolo

app = FastAPI(title="FishRank AI Server", version="1.0.0")


@app.on_event("startup")
def _startup_warmup() -> None:
    if is_yolo_available():
        warmup_yolo()


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    yolo_ready = is_yolo_available()
    model_name = "yolo+opencv" if yolo_ready else "opencv+clip"
    yolo_class_count = get_yolo_class_count() if yolo_ready else None
    return HealthResponse(
        status="ok",
        model=model_name,
        speciesClassifier=settings.species_classifier,
        clipModel=settings.clip_model_name if settings.species_classifier != "hsv" else None,
        yoloReady=yolo_ready,
        yoloModelPath=settings.yolo_model_path if yolo_ready else None,
        yoloClassCount=yolo_class_count,
        inferenceVersion=INFERENCE_VERSION if yolo_ready else None,
    )


@app.post("/analyze", response_model=AnalyzeResponse, dependencies=[Depends(verify_internal_secret)])
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    try:
        return analyze_image(request.catchId, request.imageUrl)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI 분석 실패: {exc}") from exc

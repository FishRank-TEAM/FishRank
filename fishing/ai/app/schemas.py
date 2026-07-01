from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    catchId: str
    imageUrl: str


class AnalyzeResponse(BaseModel):
    catchId: str
    rulerDetected: bool
    rulerLengthCm: float | None = None
    rulerStartPx: int | None = None
    rulerEndPx: int | None = None
    speciesDetected: str
    speciesConfidence: float = Field(ge=0, le=1)
    speciesMethod: str = "unknown"
    speciesTopCandidates: list[dict[str, float | str]] = Field(default_factory=list)
    ruleFlat: bool
    ruleVertical: bool
    ruleRuler: bool
    ruleFullBody: bool
    grade: str
    errorMessage: str | None = None


class HealthResponse(BaseModel):
    status: str
    model: str
    speciesClassifier: str
    clipModel: str | None = None
    yoloReady: bool = False
    yoloModelPath: str | None = None
    yoloClassCount: int | None = None
    inferenceVersion: str | None = None

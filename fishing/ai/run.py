import os
import sys
from pathlib import Path

from dotenv import load_dotenv
import uvicorn

AI_DIR = Path(__file__).resolve().parent
os.chdir(AI_DIR)
sys.path.insert(0, str(AI_DIR))

load_dotenv(AI_DIR / ".env")

from app.config import settings  # noqa: E402

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=False)

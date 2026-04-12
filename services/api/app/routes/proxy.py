"""Routes proxy vers les services internes (telemetry, LLM)."""

import logging

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.schemas import AnalyzeRequest, AnalyzeResponse

logger = logging.getLogger(__name__)
router = APIRouter(tags=["proxy"])


@router.get("/history")
async def get_history(
    sensor_type: str = Query(default="all", description="ultrasonic, gas, ou all"),
    limit: int = Query(default=100, ge=1, le=1000),
) -> list[dict]:
    """Récupère l'historique des capteurs depuis le service telemetry.

    Exemple requête: GET /history?sensor_type=ultrasonic&limit=50
    Exemple réponse: [{"type": "ultrasonic", "data": {...}, "timestamp": "..."}]
    """
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{settings.telemetry_url}/history",
                params={"sensor_type": sensor_type, "limit": limit},
                timeout=10.0,
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            logger.error("Erreur telemetry: %s", e)
            raise HTTPException(status_code=e.response.status_code, detail="Telemetry error")
        except httpx.ConnectError:
            logger.error("Service telemetry injoignable")
            raise HTTPException(status_code=503, detail="Telemetry service unavailable")


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    """Envoie un prompt au service LLM pour analyse.

    Exemple requête: POST /analyze {"prompt": "Analyse ces données...", "context": {}}
    Exemple réponse: {"response": "Les capteurs indiquent...", "model": "llama3.2"}
    """
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{settings.llm_url}/analyze",
                json={"prompt": req.prompt, "context": req.context},
                timeout=180.0,
            )
            resp.raise_for_status()
            data = resp.json()
            return AnalyzeResponse(response=data["response"], model=data["model"])
        except httpx.HTTPStatusError as e:
            logger.error("Erreur LLM: %s", e)
            raise HTTPException(status_code=e.response.status_code, detail="LLM error")
        except httpx.ConnectError:
            logger.error("Service LLM injoignable")
            raise HTTPException(status_code=503, detail="LLM service unavailable")

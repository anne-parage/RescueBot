"""Service LLM — proxy stateless vers Ollama (endpoint POST /analyze)."""

import logging

import httpx
from fastapi import FastAPI, HTTPException

from app.config import settings
from app.ollama_client import generate
from app.schemas import AnalyzeRequest, AnalyzeResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RescueBot LLM", version="0.1.0")


@app.get("/health")
async def health() -> dict:
    """Vérifie que le service est opérationnel.

    Exemple de réponse: {"status": "ok"}
    """
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    """Envoie un prompt (+ contexte optionnel) à Ollama et retourne la réponse.

    Exemple requête: POST /analyze {"prompt": "Résume ces données", "context": {"co": 12}}
    Exemple réponse: {"response": "Le niveau de CO est...", "model": "gemma4-26b:latest"}
    """
    try:
        text = await generate(req.prompt, req.context)
    except httpx.HTTPStatusError as e:
        logger.error("Ollama a renvoyé une erreur HTTP: %s", e)
        raise HTTPException(status_code=502, detail="Ollama HTTP error")
    except httpx.ConnectError:
        logger.error("Serveur Ollama injoignable à %s", settings.ollama_url)
        raise HTTPException(status_code=503, detail="Ollama unreachable")
    except httpx.TimeoutException:
        logger.error("Timeout Ollama (> %.0fs)", settings.request_timeout)
        raise HTTPException(status_code=504, detail="Ollama timeout")

    return AnalyzeResponse(response=text, model=settings.ollama_model)

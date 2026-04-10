import logging

from fastapi import FastAPI

logger = logging.getLogger(__name__)

app = FastAPI(title="RescueBot Telemetry", version="0.1.0")


@app.get("/health")
async def health() -> dict:
    """Vérifie que le service est opérationnel.

    Exemple de réponse: {"status": "ok"}
    """
    return {"status": "ok"}

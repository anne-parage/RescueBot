"""Service Telemetry — écoute MQTT, persiste en SQLite, expose /history."""

import logging
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, Query
from pydantic import BaseModel

from app.db import fetch_history, init_db
from app.mqtt_listener import listener

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SensorType = Literal["ultrasonic", "gas"]


class Reading(BaseModel):
    """Une lecture de capteur telle que stockée en base."""

    id: int
    sensor_type: str
    topic: str
    payload: dict
    timestamp: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise la DB et démarre le listener MQTT au boot."""
    await init_db()
    await listener.start()
    try:
        yield
    finally:
        await listener.stop()


app = FastAPI(title="RescueBot Telemetry", version="0.1.0", lifespan=lifespan)


@app.get("/health")
async def health() -> dict:
    """Vérifie que le service est opérationnel.

    Exemple de réponse: {"status": "ok"}
    """
    return {"status": "ok"}


@app.get("/history", response_model=list[Reading])
async def history(
    sensor_type: SensorType | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
) -> list[dict]:
    """Retourne les dernières lectures de capteurs, plus récentes d'abord.

    Exemple: GET /history?sensor_type=gas&limit=20
    Réponse: [{"id": 1, "sensor_type": "gas", "topic": "...", "payload": {...}, "timestamp": "..."}]
    """
    return await fetch_history(sensor_type=sensor_type, limit=limit)

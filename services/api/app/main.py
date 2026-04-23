"""Point d'entrée du service API — lifecycle MQTT et routing."""

import asyncio
import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI

from app.mqtt_client import mqtt_client
from app.routes import commands, missions, proxy, websocket
from app.tasks import mission_timeout_watcher

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    """Démarre le client MQTT et le watcher timeout au lancement."""
    await mqtt_client.start()
    watcher_task = asyncio.create_task(mission_timeout_watcher())
    logger.info("Service API démarré")
    try:
        yield
    finally:
        watcher_task.cancel()
        try:
            await watcher_task
        except asyncio.CancelledError:
            pass
        await mqtt_client.stop()
        logger.info("Service API arrêté")


app = FastAPI(title="RescueBot API", version="0.1.0", lifespan=lifespan)

app.include_router(commands.router)
app.include_router(missions.router)
app.include_router(proxy.router)
app.include_router(websocket.router)


@app.get("/health")
async def health() -> dict:
    """Vérifie que le service est opérationnel.

    Exemple de réponse: {"status": "ok"}
    """
    return {"status": "ok"}

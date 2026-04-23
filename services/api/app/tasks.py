"""Tâches de fond : surveillance des timeouts de missions manuelles."""

import asyncio
import logging
from datetime import datetime, timezone

import httpx

from app.config import settings
from app.mqtt_client import TOPIC_MISSION_TIMEOUT, mqtt_client

logger = logging.getLogger(__name__)

CHECK_INTERVAL_SECONDS = 30
TIMEOUT_SECONDS = 120


async def _fetch_timed_out_ids() -> list[int]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.telemetry_url}/missions/timed_out",
            params={"seconds": TIMEOUT_SECONDS},
            timeout=5.0,
        )
        resp.raise_for_status()
        return resp.json()


async def _mark_timeout(mission_id: int) -> None:
    ended_at = datetime.now(timezone.utc).isoformat()
    async with httpx.AsyncClient() as client:
        await client.put(
            f"{settings.telemetry_url}/missions/{mission_id}",
            json={"status": "timeout", "ended_at": ended_at},
            timeout=5.0,
        )
    mqtt_client.publish(
        TOPIC_MISSION_TIMEOUT,
        {"mission_id": mission_id, "ended_at": ended_at},
    )
    logger.warning("Mission %s passée en timeout", mission_id)


async def mission_timeout_watcher() -> None:
    """Boucle infinie qui passe en timeout les missions manuelles inactives."""
    while True:
        try:
            await asyncio.sleep(CHECK_INTERVAL_SECONDS)
            stale_ids = await _fetch_timed_out_ids()
            for mission_id in stale_ids:
                await _mark_timeout(mission_id)
        except asyncio.CancelledError:
            logger.info("Watcher timeout mission arrêté")
            raise
        except (httpx.HTTPError, ValueError) as e:
            logger.warning("Erreur watcher timeout (ignorée) : %s", e)

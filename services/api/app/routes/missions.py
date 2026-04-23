"""Endpoints missions exposés au frontend. Proxy vers telemetry + events MQTT."""

import logging
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.mqtt_client import (
    TOPIC_MISSION_STARTED,
    TOPIC_MISSION_STOPPED,
    mqtt_client,
)
from app.schemas import Mission, StartMissionRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/missions", tags=["missions"])


async def _telemetry_post(path: str, payload: dict) -> dict:
    """Appelle telemetry en POST et retourne le JSON de réponse."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{settings.telemetry_url}{path}", json=payload, timeout=10.0
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            logger.error("Erreur telemetry %s: %s", path, e)
            raise HTTPException(
                status_code=e.response.status_code, detail="Telemetry error"
            )
        except httpx.ConnectError:
            raise HTTPException(
                status_code=503, detail="Telemetry service unavailable"
            )


async def _telemetry_put(path: str, payload: dict) -> dict:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.put(
                f"{settings.telemetry_url}{path}", json=payload, timeout=10.0
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code, detail="Telemetry error"
            )
        except httpx.ConnectError:
            raise HTTPException(
                status_code=503, detail="Telemetry service unavailable"
            )


async def _telemetry_get(path: str, params: dict | None = None) -> dict | list:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{settings.telemetry_url}{path}",
                params=params,
                timeout=10.0,
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code, detail="Telemetry error"
            )
        except httpx.ConnectError:
            raise HTTPException(
                status_code=503, detail="Telemetry service unavailable"
            )


@router.post("/start", response_model=Mission, status_code=201)
async def start_mission(req: StartMissionRequest) -> dict:
    """Démarre une nouvelle mission et publie l'event MQTT mission_started.

    Exemple: POST /missions/start {"type": "manual", "objective": "Scan"}
    Réponse: {"id": 1, "status": "running", ...}
    """
    active = await _telemetry_get("/missions/active")
    if active is not None:
        raise HTTPException(
            status_code=409,
            detail=f"Une mission est déjà en cours (id={active['id']})",
        )

    payload = req.model_dump(exclude_none=True)
    mission = await _telemetry_post("/missions", payload)

    mqtt_client.publish(
        TOPIC_MISSION_STARTED,
        {
            "mission_id": mission["id"],
            "type": mission["type"],
            "started_at": mission["started_at"],
        },
    )
    logger.info("Mission %s démarrée (%s)", mission["id"], mission["type"])
    return mission


@router.post("/{mission_id}/stop", response_model=Mission)
async def stop_mission(mission_id: int) -> dict:
    """Termine une mission en cours et publie l'event MQTT mission_stopped.

    Exemple: POST /missions/42/stop
    Réponse: {"id": 42, "status": "completed", "ended_at": "..."}
    """
    ended_at = datetime.now(timezone.utc).isoformat()
    mission = await _telemetry_put(
        f"/missions/{mission_id}",
        {"status": "completed", "ended_at": ended_at},
    )

    mqtt_client.publish(
        TOPIC_MISSION_STOPPED,
        {
            "mission_id": mission_id,
            "ended_at": ended_at,
            "status": "completed",
        },
    )
    logger.info("Mission %s arrêtée", mission_id)
    return mission


@router.get("", response_model=list[Mission])
async def list_missions(
    type: str | None = Query(default=None),
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[dict]:
    """Liste les missions avec filtres optionnels.

    Exemple: GET /missions?type=manual&limit=20
    """
    params: dict = {"limit": limit, "offset": offset}
    if type:
        params["type"] = type
    if status:
        params["status"] = status
    if search:
        params["search"] = search
    result = await _telemetry_get("/missions", params=params)
    return result  # type: ignore[return-value]


@router.get("/active", response_model=Mission | None)
async def get_active_mission() -> dict | None:
    """Retourne la mission en cours ou null."""
    return await _telemetry_get("/missions/active")  # type: ignore[return-value]


@router.get("/{mission_id}", response_model=Mission)
async def get_mission(mission_id: int) -> dict:
    """Retourne le détail d'une mission.

    Exemple: GET /missions/42
    """
    return await _telemetry_get(f"/missions/{mission_id}")  # type: ignore[return-value]

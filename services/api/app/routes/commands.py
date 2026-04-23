"""Routes de commandes robot — mouvement, arrêt, statut."""

import logging

import httpx
from fastapi import APIRouter

from app.config import settings
from app.mqtt_client import TOPIC_CMD_MOVE, TOPIC_CMD_STOP, mqtt_client
from app.schemas import CommandResponse, MoveCommand, RobotStatus, StopCommand

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cmd", tags=["commands"])


async def _touch_active_mission() -> None:
    """Prolonge le timer de la mission active (fire-and-forget, ignore les erreurs)."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{settings.telemetry_url}/missions/active", timeout=2.0
            )
            if resp.status_code != 200:
                return
            active = resp.json()
            if not active or active.get("type") != "manual":
                return
            await client.post(
                f"{settings.telemetry_url}/missions/{active['id']}/touch",
                timeout=2.0,
            )
    except (httpx.HTTPError, ValueError) as e:
        logger.debug("touch_mission ignoré : %s", e)


@router.post("/move", response_model=CommandResponse)
async def move(cmd: MoveCommand) -> CommandResponse:
    """Envoie une commande de mouvement au robot via MQTT.

    Exemple requête: POST /cmd/move {"direction": "forward", "speed": 150}
    Exemple réponse: {"success": true, "message": "Move command sent: forward @ 150"}
    """
    payload = {"direction": cmd.direction, "speed": cmd.speed}
    success = mqtt_client.publish(TOPIC_CMD_MOVE, payload)
    msg = f"Move command sent: {cmd.direction} @ {cmd.speed}"
    if not success:
        msg = "Failed to send move command"
    logger.info(msg)
    if success:
        await _touch_active_mission()
    return CommandResponse(success=success, message=msg)


@router.post("/stop", response_model=CommandResponse)
async def stop(cmd: StopCommand = StopCommand()) -> CommandResponse:
    """Envoie un arrêt d'urgence au robot via MQTT.

    Exemple requête: POST /cmd/stop {"reason": "obstacle"}
    Exemple réponse: {"success": true, "message": "Stop command sent: obstacle"}
    """
    payload = {"reason": cmd.reason}
    success = mqtt_client.publish(TOPIC_CMD_STOP, payload)
    msg = f"Stop command sent: {cmd.reason}"
    if not success:
        msg = "Failed to send stop command"
    logger.info(msg)
    if success:
        await _touch_active_mission()
    return CommandResponse(success=success, message=msg)


@router.get("/status", response_model=RobotStatus)
async def status() -> RobotStatus:
    """Retourne l'état de connexion du robot.

    Exemple réponse: {"connected": true, "last_heartbeat": "2026-04-10T14:30:00Z"}
    """
    return RobotStatus(
        connected=mqtt_client.connected,
        last_heartbeat=mqtt_client.last_heartbeat,
    )

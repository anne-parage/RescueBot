"""WebSocket endpoint pour le push temps réel des capteurs vers le frontend."""

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.mqtt_client import mqtt_client

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    """WebSocket qui pousse les données capteurs en temps réel.

    Le frontend se connecte ici et reçoit les messages MQTT (ultrasonic, gas, status)
    sous forme de JSON: {"type": "ultrasonic", "data": {...}, "timestamp": "..."}
    """
    await ws.accept()
    queue = mqtt_client.subscribe_ws()
    logger.info("Client WebSocket connecté")
    try:
        while True:
            payload = await queue.get()
            await ws.send_text(json.dumps(payload))
    except WebSocketDisconnect:
        logger.info("Client WebSocket déconnecté")
    finally:
        mqtt_client.unsubscribe_ws(queue)

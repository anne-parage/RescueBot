"""Listener MQTT qui persiste les lectures de capteurs en SQLite."""

import asyncio
import json
import logging

import paho.mqtt.client as paho

from app.config import settings
from app.db import insert_reading

logger = logging.getLogger(__name__)

TOPIC_ULTRASONIC = "rescuebot/sensors/ultrasonic"
TOPIC_GAS = "rescuebot/sensors/gas"

SUBSCRIBE_TOPICS = [TOPIC_ULTRASONIC, TOPIC_GAS]

SENSOR_TYPES = {
    TOPIC_ULTRASONIC: "ultrasonic",
    TOPIC_GAS: "gas",
}


class TelemetryListener:
    """Connecte à MQTT, écoute les topics capteurs et stocke en DB."""

    def __init__(self) -> None:
        self._client: paho.Client = paho.Client(
            paho.CallbackAPIVersion.VERSION2
        )
        self._client.on_connect = self._on_connect
        self._client.on_message = self._on_message
        self._loop: asyncio.AbstractEventLoop | None = None

    def _on_connect(
        self,
        client: paho.Client,
        userdata: object,
        flags: object,
        rc: object,
        properties: object = None,
    ) -> None:
        """Subscribe aux topics capteurs à la connexion."""
        logger.info("Connecté au broker MQTT")
        for topic in SUBSCRIBE_TOPICS:
            client.subscribe(topic)
            logger.info("Subscribed: %s", topic)

    def _on_message(
        self,
        client: paho.Client,
        userdata: object,
        msg: paho.MQTTMessage,
    ) -> None:
        """Décode le payload et programme l'insert sur la loop asyncio."""
        topic = msg.topic
        try:
            payload = json.loads(msg.payload.decode())
        except (json.JSONDecodeError, UnicodeDecodeError):
            logger.warning("Payload invalide sur %s", topic)
            return

        sensor_type = SENSOR_TYPES.get(topic)
        if sensor_type is None or self._loop is None:
            return

        asyncio.run_coroutine_threadsafe(
            insert_reading(sensor_type, topic, payload),
            self._loop,
        )

    async def start(self) -> None:
        """Démarre la connexion MQTT dans un thread dédié."""
        self._loop = asyncio.get_running_loop()
        self._client.connect_async(settings.mqtt_host, settings.mqtt_port)
        self._client.loop_start()
        logger.info(
            "Listener MQTT démarré vers %s:%d",
            settings.mqtt_host,
            settings.mqtt_port,
        )

    async def stop(self) -> None:
        """Arrête proprement le listener."""
        self._client.loop_stop()
        self._client.disconnect()
        logger.info("Listener MQTT arrêté")


listener = TelemetryListener()

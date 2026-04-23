"""Client MQTT async pour la communication avec le robot via Mosquitto."""

import asyncio
import json
import logging
from datetime import datetime, timezone, timedelta

import paho.mqtt.client as paho

from app.config import settings

logger = logging.getLogger(__name__)

# Topics MQTT
TOPIC_ULTRASONIC = "rescuebot/sensors/ultrasonic"
TOPIC_GAS = "rescuebot/sensors/gas"
TOPIC_CMD_MOVE = "rescuebot/cmd/move"
TOPIC_CMD_STOP = "rescuebot/cmd/stop"
TOPIC_STATUS = "rescuebot/status"
TOPIC_MISSION_STARTED = "rescuebot/events/mission_started"
TOPIC_MISSION_STOPPED = "rescuebot/events/mission_stopped"
TOPIC_MISSION_TIMEOUT = "rescuebot/events/mission_timeout"

SUBSCRIBE_TOPICS = [TOPIC_ULTRASONIC, TOPIC_GAS, TOPIC_STATUS]

HEARTBEAT_TIMEOUT = timedelta(seconds=10)


class MQTTClient:
    """Gère la connexion MQTT et le dispatch des messages."""

    def __init__(self) -> None:
        self._client: paho.Client = paho.Client(
            paho.CallbackAPIVersion.VERSION2
        )
        self._client.on_connect = self._on_connect
        self._client.on_message = self._on_message
        self._loop: asyncio.AbstractEventLoop | None = None
        self._ws_subscribers: list[asyncio.Queue] = []
        self.broker_connected: bool = False
        self._last_heartbeat_dt: datetime | None = None

    def _on_connect(
        self,
        client: paho.Client,
        userdata: object,
        flags: object,
        rc: object,
        properties: object = None,
    ) -> None:
        """Callback à la connexion au broker — subscribe aux topics."""
        logger.info("Connecté au broker MQTT")
        self.broker_connected = True
        for topic in SUBSCRIBE_TOPICS:
            client.subscribe(topic)
            logger.info("Subscribed: %s", topic)

    def _on_message(
        self,
        client: paho.Client,
        userdata: object,
        msg: paho.MQTTMessage,
    ) -> None:
        """Callback à la réception d'un message — dispatch vers les WS."""
        topic = msg.topic
        try:
            payload = json.loads(msg.payload.decode())
        except (json.JSONDecodeError, UnicodeDecodeError):
            logger.warning("Payload invalide sur %s", topic)
            return

        if topic == TOPIC_STATUS:
            self._last_heartbeat_dt = datetime.now(timezone.utc)

        ws_payload = {
            "type": topic.split("/")[-1],
            "data": payload,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        if self._loop is not None:
            self._loop.call_soon_threadsafe(
                self._dispatch_to_subscribers, ws_payload
            )

    @property
    def connected(self) -> bool:
        """Le robot est connecté si un heartbeat a été reçu récemment."""
        if self._last_heartbeat_dt is None:
            return False
        return datetime.now(timezone.utc) - self._last_heartbeat_dt < HEARTBEAT_TIMEOUT

    @property
    def last_heartbeat(self) -> str | None:
        """ISO timestamp du dernier heartbeat reçu."""
        if self._last_heartbeat_dt is None:
            return None
        return self._last_heartbeat_dt.isoformat()

    def _dispatch_to_subscribers(self, payload: dict) -> None:
        """Envoie le message à toutes les queues WebSocket."""
        stale: list[asyncio.Queue] = []
        for queue in self._ws_subscribers:
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                stale.append(queue)
        for q in stale:
            self._ws_subscribers.remove(q)

    def subscribe_ws(self) -> asyncio.Queue:
        """Enregistre un nouveau subscriber WebSocket."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._ws_subscribers.append(queue)
        return queue

    def unsubscribe_ws(self, queue: asyncio.Queue) -> None:
        """Retire un subscriber WebSocket."""
        if queue in self._ws_subscribers:
            self._ws_subscribers.remove(queue)

    def publish(self, topic: str, payload: dict) -> bool:
        """Publie un message JSON sur un topic MQTT."""
        result = self._client.publish(topic, json.dumps(payload))
        return result.rc == paho.MQTT_ERR_SUCCESS

    async def start(self) -> None:
        """Démarre la connexion MQTT dans un thread séparé."""
        self._loop = asyncio.get_running_loop()
        self._client.connect_async(settings.mqtt_host, settings.mqtt_port)
        self._client.loop_start()
        logger.info(
            "Client MQTT démarré vers %s:%d",
            settings.mqtt_host,
            settings.mqtt_port,
        )

    async def stop(self) -> None:
        """Arrête proprement le client MQTT."""
        self._client.loop_stop()
        self._client.disconnect()
        self.broker_connected = False
        logger.info("Client MQTT arrêté")


mqtt_client = MQTTClient()

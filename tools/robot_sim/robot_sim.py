"""Simulateur de robot RescueBot — se fait passer pour l'ESP32 sur MQTT.

Publie les capteurs aux cadences du firmware réel et réagit aux commandes,
pour exercer la chaîne MQTT -> api -> WebSocket -> frontend (et la persistance
telemetry) sans matériel.

Scénarios pilotables au clavier pendant l'exécution (taper la commande + Entrée) :
    normal      valeurs sûres et stables
    obstacle    distance avant < 10 cm (refus de 'forward' + obstacle_blocked)
    co          co_level > 200 ppm (déclenche l'AlertModal du dashboard)
    disconnect  robot silencieux (déclenche le DisconnectionOverlay après 10 s)
    quit        arrête le simulateur
"""

import argparse
import json
import logging
import random
import threading
import time
from datetime import datetime, timezone

import paho.mqtt.client as paho

logger = logging.getLogger("robot_sim")

# Topics publiés par le robot
TOPIC_ULTRASONIC = "rescuebot/sensors/ultrasonic"
TOPIC_GAS = "rescuebot/sensors/gas"
TOPIC_STATUS = "rescuebot/status"
TOPIC_OBSTACLE = "rescuebot/events/obstacle_blocked"

# Topics reçus par le robot
TOPIC_CMD_MOVE = "rescuebot/cmd/move"
TOPIC_CMD_STOP = "rescuebot/cmd/stop"
TOPIC_CMD_CALIBRATE = "rescuebot/cmd/calibrate"

CMD_TOPICS = [TOPIC_CMD_MOVE, TOPIC_CMD_STOP, TOPIC_CMD_CALIBRATE]

# Cadences de publication (ms), conformes à .claude/rules/arduino.md
PERIOD_ULTRASONIC_MS = 200
PERIOD_GAS_MS = 500
PERIOD_STATUS_MS = 2000

# Seuil de sécurité embarqué (cm) — mime la règle dure du firmware
OBSTACLE_STOP_CM = 10

# Valeurs cibles des capteurs pour chaque scénario
SCENARIOS: dict[str, dict[str, float | bool]] = {
    "normal": {"front": 110.0, "co": 14.0, "air": 86.0, "online": True},
    "obstacle": {"front": 8.0, "co": 14.0, "air": 86.0, "online": True},
    "co": {"front": 110.0, "co": 220.0, "air": 52.0, "online": True},
    "disconnect": {"front": 110.0, "co": 14.0, "air": 86.0, "online": False},
}


def _now_iso() -> str:
    """Retourne l'horodatage courant au format ISO 8601 UTC."""
    return datetime.now(timezone.utc).isoformat()


class RobotSimulator:
    """Publie des capteurs simulés et réagit aux commandes MQTT du backend."""

    def __init__(self, host: str, port: int) -> None:
        self._client: paho.Client = paho.Client(paho.CallbackAPIVersion.VERSION2)
        self._client.on_connect = self._on_connect
        self._client.on_message = self._on_message
        self._host = host
        self._port = port

        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._start_monotonic = time.monotonic()

        # État capteurs courant (piloté par le scénario actif)
        self._scenario = "normal"
        self._front = 110.0
        self._co = 14.0
        self._air = 86.0
        self._online = True

    # -- callbacks MQTT ---------------------------------------------------

    def _on_connect(
        self,
        client: paho.Client,
        userdata: object,
        flags: object,
        rc: object,
        properties: object = None,
    ) -> None:
        """Subscribe aux topics de commande à la connexion."""
        logger.info("Connecté au broker MQTT")
        for topic in CMD_TOPICS:
            client.subscribe(topic)

    def _on_message(
        self,
        client: paho.Client,
        userdata: object,
        msg: paho.MQTTMessage,
    ) -> None:
        """Décode une commande reçue et la traite."""
        try:
            payload = json.loads(msg.payload.decode()) if msg.payload else {}
        except (json.JSONDecodeError, UnicodeDecodeError):
            logger.warning("Payload invalide sur %s", msg.topic)
            return

        if msg.topic == TOPIC_CMD_MOVE:
            self._handle_move(payload)
        elif msg.topic == TOPIC_CMD_STOP:
            logger.info("Commande STOP reçue (reason=%s)", payload.get("reason"))
        elif msg.topic == TOPIC_CMD_CALIBRATE:
            logger.info("Commande CALIBRATE reçue — recalage baselines gaz")

    def _handle_move(self, payload: dict) -> None:
        """Traite une commande de mouvement, avec sécurité obstacle embarquée."""
        direction = payload.get("direction")
        speed = payload.get("speed")
        with self._lock:
            front = self._front

        if direction == "forward" and front < OBSTACLE_STOP_CM:
            self._publish(
                TOPIC_OBSTACLE,
                {
                    "direction": "forward",
                    "distance": round(front, 1),
                    "timestamp": _now_iso(),
                },
            )
            logger.warning(
                "MOVE forward REFUSÉ — obstacle à %.1f cm (< %d cm)",
                front,
                OBSTACLE_STOP_CM,
            )
            return

        logger.info("MOVE %s @ speed=%s", direction, speed)

    # -- scénarios --------------------------------------------------------

    def set_scenario(self, name: str) -> bool:
        """Bascule sur un scénario. Retourne False si le nom est inconnu."""
        params = SCENARIOS.get(name)
        if params is None:
            return False
        with self._lock:
            self._scenario = name
            self._front = float(params["front"])
            self._co = float(params["co"])
            self._air = float(params["air"])
            self._online = bool(params["online"])
        logger.info("Scénario actif : %s", name)
        return True

    def stopped(self) -> bool:
        """Indique si le simulateur a reçu l'ordre de s'arrêter."""
        return self._stop_event.is_set()

    def stop(self) -> None:
        """Demande l'arrêt de la boucle de publication."""
        self._stop_event.set()

    # -- construction des payloads capteurs -------------------------------

    def _ultrasonic_payload(self) -> dict:
        """Construit un payload ultrason avec bruit autour de la cible."""
        with self._lock:
            front_base = self._front
        return {
            "front": round(max(2.0, front_base + random.uniform(-1.5, 1.5)), 1),
            "back": round(120.0 + random.uniform(-5, 5), 1),
            "left": round(30.0 + random.uniform(-3, 3), 1),
            "right": round(88.0 + random.uniform(-3, 3), 1),
        }

    def _gas_payload(self) -> dict:
        """Construit un payload gaz avec bruit autour des cibles."""
        with self._lock:
            co_base = self._co
            air_base = self._air
        co = max(0.0, co_base + random.uniform(-2, 2))
        air = min(100.0, max(0.0, air_base + random.uniform(-2, 2)))
        return {"co_level": round(co, 1), "air_quality": round(air, 1)}

    def _status_payload(self) -> dict:
        """Construit le heartbeat avec l'uptime en secondes."""
        return {"uptime": int(time.monotonic() - self._start_monotonic)}

    def _publish(self, topic: str, payload: dict) -> None:
        """Publie un payload JSON sur un topic."""
        self._client.publish(topic, json.dumps(payload))

    # -- boucle principale ------------------------------------------------

    def run(self) -> None:
        """Connecte au broker et publie les capteurs jusqu'à l'arrêt."""
        try:
            self._client.connect(self._host, self._port)
        except (ConnectionRefusedError, OSError) as exc:
            logger.error(
                "Broker MQTT injoignable sur %s:%d (%s). "
                "Lance d'abord : docker compose up -d mqtt",
                self._host,
                self._port,
                exc,
            )
            return

        self._client.loop_start()
        logger.info("Simulateur démarré vers %s:%d", self._host, self._port)
        logger.info("Commandes : normal | obstacle | co | disconnect | quit")

        next_us = next_gas = next_status = 0.0
        try:
            while not self._stop_event.is_set():
                now = time.monotonic() * 1000
                with self._lock:
                    online = self._online
                if online:
                    if now >= next_us:
                        self._publish(TOPIC_ULTRASONIC, self._ultrasonic_payload())
                        next_us = now + PERIOD_ULTRASONIC_MS
                    if now >= next_gas:
                        self._publish(TOPIC_GAS, self._gas_payload())
                        next_gas = now + PERIOD_GAS_MS
                    if now >= next_status:
                        self._publish(TOPIC_STATUS, self._status_payload())
                        next_status = now + PERIOD_STATUS_MS
                self._stop_event.wait(0.05)
        finally:
            self._client.loop_stop()
            self._client.disconnect()
            logger.info("Simulateur arrêté")


def _stdin_loop(sim: RobotSimulator) -> None:
    """Lit les commandes de scénario sur stdin (thread dédié)."""
    while not sim.stopped():
        try:
            line = input().strip().lower()
        except EOFError:
            break
        if not line:
            continue
        if line in ("quit", "q", "exit"):
            sim.stop()
            break
        if not sim.set_scenario(line):
            logger.warning(
                "Scénario inconnu : %s (normal|obstacle|co|disconnect|quit)", line
            )


def main() -> None:
    """Point d'entrée : parse les arguments et lance le simulateur."""
    parser = argparse.ArgumentParser(
        description="Simulateur de robot RescueBot (publie/écoute MQTT)"
    )
    parser.add_argument("--host", default="localhost", help="Hôte du broker MQTT")
    parser.add_argument("--port", type=int, default=1883, help="Port du broker MQTT")
    parser.add_argument(
        "--scenario",
        default="normal",
        choices=list(SCENARIOS),
        help="Scénario de démarrage",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="[ROBOT-SIM] %(message)s")

    sim = RobotSimulator(args.host, args.port)
    sim.set_scenario(args.scenario)

    stdin_thread = threading.Thread(target=_stdin_loop, args=(sim,), daemon=True)
    stdin_thread.start()

    try:
        sim.run()
    except KeyboardInterrupt:
        sim.stop()


if __name__ == "__main__":
    main()

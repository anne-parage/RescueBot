"""Modèles Pydantic pour les entrées/sorties de l'API."""

from typing import Literal

from pydantic import BaseModel, Field


class MoveCommand(BaseModel):
    """Commande de mouvement envoyée au robot.

    Exemple requête: {"direction": "forward", "speed": 150}
    """

    direction: str = Field(
        ..., description="Direction: forward, backward, left, right"
    )
    speed: int = Field(
        default=120,
        ge=80,
        le=150,
        multiple_of=5,
        description="Vitesse PWM. Presets: 80 (Lent), 120 (Normal), 150 (Rapide)",
    )


class StopCommand(BaseModel):
    """Commande d'arrêt d'urgence.

    Exemple requête: {"reason": "obstacle detected"}
    """

    reason: str = Field(default="manual", description="Raison de l'arrêt")


class CommandResponse(BaseModel):
    """Réponse standard après envoi d'une commande.

    Exemple réponse: {"success": true, "message": "Command sent"}
    """

    success: bool
    message: str


class RobotStatus(BaseModel):
    """État actuel du robot.

    Exemple réponse: {"connected": true, "last_heartbeat": "2026-04-10T14:30:00Z"}
    """

    connected: bool
    last_heartbeat: str | None = None


class UltrasonicData(BaseModel):
    """Données des 4 capteurs ultrason HC-SR04.

    Exemple: {"front": 45.2, "back": 120.0, "left": 30.5, "right": 88.1}
    """

    front: float
    back: float
    left: float
    right: float


class GasData(BaseModel):
    """Données des capteurs de gaz MQ-7 et MQ-135.

    Exemple: {"co_level": 12.5, "air_quality": 85.3}
    """

    co_level: float
    air_quality: float


class SensorPayload(BaseModel):
    """Payload envoyé via WebSocket au frontend.

    Exemple: {"type": "ultrasonic", "data": {"front": 45.2, ...}, "timestamp": "..."}
    """

    type: str
    data: UltrasonicData | GasData | dict
    timestamp: str


class AnalyzeRequest(BaseModel):
    """Requête d'analyse LLM.

    Exemple requête: {"prompt": "Analyse les données capteurs suivantes...", "context": {...}}
    """

    prompt: str
    context: dict = Field(default_factory=dict)


class AnalyzeResponse(BaseModel):
    """Réponse de l'analyse LLM.

    Exemple réponse: {"response": "Les capteurs indiquent...", "model": "llama3.2"}
    """

    response: str
    model: str


class PlanStep(BaseModel):
    """Étape d'un plan de mission autonome.

    Exemple: {"order": 1, "text": "Scanner la zone nord"}
    """

    order: int
    text: str


class StartMissionRequest(BaseModel):
    """Payload pour démarrer une nouvelle mission.

    Exemple: {"type": "manual", "objective": "Reconnaissance salle 2"}
    """

    type: Literal["manual", "autonomous"]
    objective: str | None = None
    plan: list[PlanStep] | None = None
    operator: str | None = None


class Mission(BaseModel):
    """Représentation complète d'une mission retournée par l'API.

    Exemple: {"id": 1, "type": "manual", "status": "running", ...}
    """

    id: int
    type: str
    status: str
    started_at: str
    ended_at: str | None = None
    objective: str | None = None
    plan: list[PlanStep] | None = None
    operator: str | None = None
    last_command_at: str | None = None


class StatsBlock(BaseModel):
    """Stats agrégées pour un champ numérique d'un capteur."""

    min: float
    max: float
    avg: float


class SensorSummary(BaseModel):
    """Stats capteurs agrégées pour la durée d'une mission.

    Les champs StatsBlock sont None si aucune lecture n'a été reçue.
    """

    count_gas: int
    count_ultrasonic: int
    co_level: StatsBlock | None = None
    air_quality: StatsBlock | None = None
    ultrasonic: dict[str, StatsBlock | None]


class MissionReport(BaseModel):
    """Rapport complet d'une mission, généré à la volée.

    Exemple: {"mission": {...}, "duration_seconds": 124, "sensor_summary": {...},
              "summary_narrative": "La mission s'est..."}
    """

    mission: Mission
    duration_seconds: int | None = None
    sensor_summary: SensorSummary
    summary_narrative: str | None = None
    summary_error: str | None = None
    global_evaluation: str | None = None
    global_evaluation_error: str | None = None

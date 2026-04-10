"""Modèles Pydantic pour les entrées/sorties de l'API."""

from pydantic import BaseModel, Field


class MoveCommand(BaseModel):
    """Commande de mouvement envoyée au robot.

    Exemple requête: {"direction": "forward", "speed": 150}
    """

    direction: str = Field(
        ..., description="Direction: forward, backward, left, right"
    )
    speed: int = Field(
        default=150, ge=0, le=255, description="Vitesse PWM (0-255)"
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

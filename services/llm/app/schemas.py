"""Schémas Pydantic des entrées/sorties du service LLM."""

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    """Requête d'analyse : un prompt et un contexte optionnel (ex: lectures capteurs)."""

    prompt: str = Field(..., min_length=1)
    context: dict | None = None


class AnalyzeResponse(BaseModel):
    """Réponse du LLM avec le texte généré et le modèle utilisé."""

    response: str
    model: str

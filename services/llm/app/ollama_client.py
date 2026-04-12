"""Client HTTP async pour l'API Ollama (endpoint /api/generate)."""

import json
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def build_prompt(prompt: str, context: dict | None) -> str:
    """Concatène le contexte (JSON) et le prompt utilisateur."""
    if not context:
        return prompt
    return (
        "Contexte (données capteurs du robot, format JSON):\n"
        f"{json.dumps(context, ensure_ascii=False)}\n\n"
        f"Question: {prompt}"
    )


async def generate(prompt: str, context: dict | None = None) -> str:
    """Envoie un prompt à Ollama et retourne le texte généré.

    Lève httpx.HTTPError en cas d'échec de l'appel.
    """
    full_prompt = build_prompt(prompt, context)
    payload = {
        "model": settings.ollama_model,
        "prompt": full_prompt,
        "stream": False,
        "options": {"num_ctx": settings.ollama_context_length},
    }

    url = f"{settings.ollama_url.rstrip('/')}/api/generate"
    logger.info("Appel Ollama → %s (modèle=%s)", url, settings.ollama_model)

    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()

    return data.get("response", "").strip()

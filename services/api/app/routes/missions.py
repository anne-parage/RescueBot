"""Endpoints missions exposés au frontend. Proxy vers telemetry + events MQTT."""

import logging
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from app.config import settings
from app.mqtt_client import (
    TOPIC_MISSION_STARTED,
    TOPIC_MISSION_STOPPED,
    mqtt_client,
)
from app.pdf import render_report_pdf
from app.schemas import Mission, MissionReport, StartMissionRequest

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


def _format_stats(label: str, stats: dict | None, unit: str) -> str:
    """Formate un bloc de stats pour le prompt LLM."""
    if stats is None:
        return f"- {label} : aucune lecture"
    return (
        f"- {label} : min {stats['min']:.1f}{unit}, max {stats['max']:.1f}{unit},"
        f" moyenne {stats['avg']:.1f}{unit}"
    )


def _build_narrative_prompt(mission: dict, summary: dict, duration: int | None) -> str:
    """Construit le prompt de résumé narratif pour le LLM."""
    duration_str = f"{duration} secondes" if duration is not None else "inconnue"
    objective = mission.get("objective") or "non précisé"
    lines = [
        "Génère un résumé narratif d'une mission de reconnaissance robotique"
        " en 2 ou 3 phrases en français.",
        "",
        f"Mission #{mission['id']} ({mission['type']}) — durée {duration_str}",
        f"Statut final : {mission['status']}",
        f"Objectif : \"{objective}\"",
        "",
        "Statistiques capteurs :",
        _format_stats("Monoxyde de carbone (CO)", summary.get("co_level"), " ppm"),
        _format_stats("Qualité de l'air", summary.get("air_quality"), "/100"),
        f"- {summary['count_gas']} lectures gas, "
        f"{summary['count_ultrasonic']} lectures ultrasonic",
        "",
        "Réponds UNIQUEMENT avec le résumé narratif, sans markdown, sans titre,"
        " sans introduction.",
    ]
    return "\n".join(lines)


def _build_evaluation_prompt(mission: dict, summary: dict) -> str:
    """Construit le prompt d'évaluation globale pour les missions autonomes."""
    plan = mission.get("plan") or []
    plan_str = "\n".join(f"  {s['order']}. {s['text']}" for s in plan) or "  (aucun)"
    return (
        f"Évalue brièvement (3 phrases max, en français) le déroulé de cette"
        f" mission autonome.\n\n"
        f"Objectif : \"{mission.get('objective') or 'non précisé'}\"\n"
        f"Plan d'exécution prévu :\n{plan_str}\n\n"
        f"Données capteurs collectées : {summary['count_gas']} gas,"
        f" {summary['count_ultrasonic']} ultrasonic.\n\n"
        f"Réponds UNIQUEMENT avec l'évaluation en texte plat, sans markdown."
    )


async def _call_llm(prompt: str) -> str:
    """Appelle le service LLM. Lève httpx.HTTPError si problème."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.llm_url}/analyze",
            json={"prompt": prompt, "context": {}},
            timeout=180.0,
        )
        resp.raise_for_status()
        return resp.json()["response"]


def _compute_duration(mission: dict) -> int | None:
    """Calcule la durée de la mission en secondes (None si pas de fin)."""
    if not mission.get("ended_at"):
        return None
    try:
        start = datetime.fromisoformat(mission["started_at"])
        end = datetime.fromisoformat(mission["ended_at"])
        return int((end - start).total_seconds())
    except (ValueError, KeyError):
        return None


@router.get("/{mission_id}/report", response_model=MissionReport)
async def get_mission_report(mission_id: int) -> dict:
    """Génère le rapport complet d'une mission (capteurs + résumé LLM).

    Si Ollama est injoignable, le rapport est renvoyé avec
    summary_narrative=null et un message dans summary_error.

    Exemple: GET /missions/42/report
    """
    mission = await _telemetry_get(f"/missions/{mission_id}")
    if not isinstance(mission, dict):
        raise HTTPException(status_code=404, detail="Mission introuvable")

    summary = await _telemetry_get(f"/missions/{mission_id}/sensor_summary")
    duration = _compute_duration(mission)

    narrative: str | None = None
    narrative_error: str | None = None
    try:
        narrative = (await _call_llm(_build_narrative_prompt(
            mission, summary, duration
        ))).strip()
    except httpx.HTTPError as e:
        logger.warning("LLM narrative indisponible: %s", e)
        narrative_error = "Résumé narratif indisponible (service LLM injoignable)"

    evaluation: str | None = None
    evaluation_error: str | None = None
    if mission["type"] == "autonomous":
        try:
            evaluation = (await _call_llm(
                _build_evaluation_prompt(mission, summary)
            )).strip()
        except httpx.HTTPError as e:
            logger.warning("LLM evaluation indisponible: %s", e)
            evaluation_error = (
                "Évaluation globale indisponible (service LLM injoignable)"
            )

    return {
        "mission": mission,
        "duration_seconds": duration,
        "sensor_summary": summary,
        "summary_narrative": narrative,
        "summary_error": narrative_error,
        "global_evaluation": evaluation,
        "global_evaluation_error": evaluation_error,
    }


@router.get("/{mission_id}/report.pdf")
async def get_mission_report_pdf(mission_id: int) -> Response:
    """Génère et renvoie le rapport au format PDF.

    Exemple: GET /missions/42/report.pdf
    Réponse: application/pdf
    """
    report = await get_mission_report(mission_id)
    pdf_bytes = render_report_pdf(report)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="rapport_mission_{mission_id}.pdf"'
            ),
        },
    )

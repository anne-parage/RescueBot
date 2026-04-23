"""Endpoints internes missions — appelés uniquement par le service API.

Expose les opérations CRUD sur la table missions. Pas accessible au frontend.
"""

from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.db import (
    create_mission,
    get_active_mission_id,
    get_mission,
    list_missions,
    list_timed_out_missions,
    touch_mission,
    update_mission_status,
)

router = APIRouter(prefix="/missions", tags=["missions"])


class PlanStep(BaseModel):
    """Une étape de plan de mission autonome."""

    order: int
    text: str


class CreateMissionRequest(BaseModel):
    """Payload de création d'une mission.

    Exemple: {"type": "manual", "objective": "Scan zone nord"}
    """

    type: Literal["manual", "autonomous"]
    objective: str | None = None
    plan: list[PlanStep] | None = None
    operator: str | None = None


class UpdateMissionRequest(BaseModel):
    """Payload de mise à jour d'une mission.

    Exemple: {"status": "completed"}
    """

    status: Literal["running", "completed", "interrupted", "timeout"]
    ended_at: str | None = None


class MissionResponse(BaseModel):
    """Structure retournée pour une mission."""

    id: int
    type: str
    status: str
    started_at: str
    ended_at: str | None = None
    objective: str | None = None
    plan: list[PlanStep] | None = None
    operator: str | None = None
    last_command_at: str | None = None


@router.post("", response_model=MissionResponse, status_code=201)
async def create_mission_endpoint(req: CreateMissionRequest) -> dict:
    """Crée une nouvelle mission en status='running'.

    Exemple requête: POST /missions
      {"type": "manual", "objective": "Reconnaissance"}
    Exemple réponse: {"id": 1, "status": "running", ...}
    """
    plan_dicts = (
        [step.model_dump() for step in req.plan] if req.plan is not None else None
    )
    return await create_mission(
        type_=req.type,
        objective=req.objective,
        plan=plan_dicts,
        operator=req.operator,
    )


@router.get("", response_model=list[MissionResponse])
async def list_missions_endpoint(
    type: Literal["manual", "autonomous"] | None = Query(default=None),
    status: Literal["running", "completed", "interrupted", "timeout"] | None = (
        Query(default=None)
    ),
    search: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[dict]:
    """Liste les missions avec filtres optionnels.

    Exemple: GET /missions?type=manual&status=completed&limit=10
    """
    return await list_missions(
        type_=type,
        status=status,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get("/active", response_model=MissionResponse | None)
async def get_active_mission_endpoint() -> dict | None:
    """Retourne la mission en cours (status='running') ou null."""
    mission_id = await get_active_mission_id()
    if mission_id is None:
        return None
    return await get_mission(mission_id)


@router.get("/timed_out", response_model=list[int])
async def list_timed_out_endpoint(
    seconds: int = Query(default=120, ge=1),
) -> list[int]:
    """Retourne les IDs des missions manuelles inactives depuis > seconds.

    Exemple: GET /missions/timed_out?seconds=120
    """
    return await list_timed_out_missions(seconds)


@router.get("/{mission_id}", response_model=MissionResponse)
async def get_mission_endpoint(mission_id: int) -> dict:
    """Retourne le détail d'une mission.

    Exemple: GET /missions/42
    """
    mission = await get_mission(mission_id)
    if mission is None:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    return mission


@router.put("/{mission_id}", response_model=MissionResponse)
async def update_mission_endpoint(
    mission_id: int, req: UpdateMissionRequest
) -> dict:
    """Met à jour le statut d'une mission.

    Exemple: PUT /missions/42 {"status": "completed"}
    """
    mission = await update_mission_status(
        mission_id=mission_id, status=req.status, ended_at=req.ended_at
    )
    if mission is None:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    return mission


@router.post("/{mission_id}/touch", status_code=204)
async def touch_mission_endpoint(mission_id: int) -> None:
    """Prolonge le timeout d'une mission manuelle (appelé à chaque commande)."""
    mission = await get_mission(mission_id)
    if mission is None:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    await touch_mission(mission_id)

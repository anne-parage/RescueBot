"""Accès SQLite async pour la persistance des lectures de capteurs et missions."""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import aiosqlite

from app.config import settings

logger = logging.getLogger(__name__)

SCHEMA = """
CREATE TABLE IF NOT EXISTS sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sensor_type TEXT NOT NULL,
    topic TEXT NOT NULL,
    payload TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    mission_id INTEGER REFERENCES missions(id)
);
CREATE INDEX IF NOT EXISTS idx_sensor_type_ts
    ON sensor_readings (sensor_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_mission_id
    ON sensor_readings (mission_id);

CREATE TABLE IF NOT EXISTS missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('manual', 'autonomous')),
    status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'interrupted', 'timeout')),
    started_at TEXT NOT NULL,
    ended_at TEXT,
    objective TEXT,
    plan_json TEXT,
    report_json TEXT,
    operator TEXT,
    last_command_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_missions_started_at ON missions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
"""


async def _ensure_mission_id_column(db: aiosqlite.Connection) -> None:
    """Ajoute la colonne mission_id à sensor_readings si absente (migration)."""
    async with db.execute("PRAGMA table_info(sensor_readings)") as cursor:
        columns = {row[1] async for row in cursor}
    if "mission_id" not in columns:
        await db.execute(
            "ALTER TABLE sensor_readings ADD COLUMN mission_id INTEGER"
            " REFERENCES missions(id)"
        )
        logger.info("Colonne mission_id ajoutée à sensor_readings")


async def init_db() -> None:
    """Crée le fichier DB et les tables si nécessaire."""
    Path(settings.db_path).parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(settings.db_path) as db:
        await db.executescript(SCHEMA)
        await _ensure_mission_id_column(db)
        await db.commit()
    logger.info("Base SQLite initialisée : %s", settings.db_path)


async def get_active_mission_id() -> int | None:
    """Retourne l'id de la mission en cours (status='running') si une existe."""
    async with aiosqlite.connect(settings.db_path) as db:
        async with db.execute(
            "SELECT id FROM missions WHERE status='running' LIMIT 1"
        ) as cursor:
            row = await cursor.fetchone()
    return row[0] if row else None


async def insert_reading(sensor_type: str, topic: str, payload: dict) -> None:
    """Insère une lecture de capteur avec timestamp UTC ISO.

    Associe automatiquement la lecture à la mission active si une existe.
    """
    ts = datetime.now(timezone.utc).isoformat()
    mission_id = await get_active_mission_id()
    async with aiosqlite.connect(settings.db_path) as db:
        await db.execute(
            "INSERT INTO sensor_readings"
            " (sensor_type, topic, payload, timestamp, mission_id)"
            " VALUES (?, ?, ?, ?, ?)",
            (sensor_type, topic, json.dumps(payload), ts, mission_id),
        )
        await db.commit()


async def fetch_history(
    sensor_type: str | None = None,
    limit: int = 100,
) -> list[dict]:
    """Retourne les dernières lectures, filtrables par type de capteur."""
    query = (
        "SELECT id, sensor_type, topic, payload, timestamp, mission_id"
        " FROM sensor_readings"
    )
    params: tuple = ()
    if sensor_type is not None:
        query += " WHERE sensor_type = ?"
        params = (sensor_type,)
    query += " ORDER BY timestamp DESC LIMIT ?"
    params = (*params, limit)

    async with aiosqlite.connect(settings.db_path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(query, params) as cursor:
            rows = await cursor.fetchall()

    return [
        {
            "id": row["id"],
            "sensor_type": row["sensor_type"],
            "topic": row["topic"],
            "payload": json.loads(row["payload"]),
            "timestamp": row["timestamp"],
            "mission_id": row["mission_id"],
        }
        for row in rows
    ]


def _row_to_mission(row: aiosqlite.Row) -> dict:
    """Convertit une ligne DB en dict mission avec parsing JSON."""
    return {
        "id": row["id"],
        "type": row["type"],
        "status": row["status"],
        "started_at": row["started_at"],
        "ended_at": row["ended_at"],
        "objective": row["objective"],
        "plan": json.loads(row["plan_json"]) if row["plan_json"] else None,
        "report": json.loads(row["report_json"]) if row["report_json"] else None,
        "operator": row["operator"],
        "last_command_at": row["last_command_at"],
    }


async def create_mission(
    type_: str,
    objective: str | None,
    plan: list[dict] | None,
    operator: str | None = None,
) -> dict:
    """Crée une mission en status='running'. Retourne la mission créée."""
    started_at = datetime.now(timezone.utc).isoformat()
    plan_json = json.dumps(plan) if plan else None
    async with aiosqlite.connect(settings.db_path) as db:
        cursor = await db.execute(
            "INSERT INTO missions"
            " (type, status, started_at, objective, plan_json, operator,"
            " last_command_at)"
            " VALUES (?, 'running', ?, ?, ?, ?, ?)",
            (type_, started_at, objective, plan_json, operator, started_at),
        )
        await db.commit()
        mission_id = cursor.lastrowid
    return await get_mission(mission_id)


async def get_mission(mission_id: int) -> dict | None:
    """Retourne une mission par id, ou None si introuvable."""
    async with aiosqlite.connect(settings.db_path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM missions WHERE id = ?", (mission_id,)
        ) as cursor:
            row = await cursor.fetchone()
    return _row_to_mission(row) if row else None


async def list_missions(
    type_: str | None = None,
    status: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """Liste les missions avec filtres optionnels."""
    query = "SELECT * FROM missions WHERE 1=1"
    params: list = []
    if type_:
        query += " AND type = ?"
        params.append(type_)
    if status:
        query += " AND status = ?"
        params.append(status)
    if search:
        query += " AND (objective LIKE ? OR CAST(id AS TEXT) LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
    query += " ORDER BY started_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    async with aiosqlite.connect(settings.db_path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
    return [_row_to_mission(row) for row in rows]


async def update_mission_status(
    mission_id: int,
    status: str,
    ended_at: str | None = None,
) -> dict | None:
    """Met à jour le statut et éventuellement la date de fin."""
    if ended_at is None and status != "running":
        ended_at = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(settings.db_path) as db:
        await db.execute(
            "UPDATE missions SET status = ?, ended_at = ? WHERE id = ?",
            (status, ended_at, mission_id),
        )
        await db.commit()
    return await get_mission(mission_id)


async def touch_mission(mission_id: int) -> None:
    """Met à jour last_command_at pour prolonger le timeout d'une mission manuelle."""
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(settings.db_path) as db:
        await db.execute(
            "UPDATE missions SET last_command_at = ? WHERE id = ?",
            (now, mission_id),
        )
        await db.commit()


def _stats(values: list[float]) -> dict | None:
    """Calcule min/max/avg pour une liste de valeurs numériques."""
    if not values:
        return None
    return {
        "min": min(values),
        "max": max(values),
        "avg": sum(values) / len(values),
    }


async def get_sensor_summary(mission_id: int) -> dict:
    """Agrège les stats min/max/avg des capteurs pendant une mission.

    Retourne un dict avec count_gas, count_ultrasonic, co_level, air_quality,
    ultrasonic (front/back/left/right). Champs à None si aucune donnée.
    """
    co_levels: list[float] = []
    air_qualities: list[float] = []
    ultrasonics: dict[str, list[float]] = {
        "front": [],
        "back": [],
        "left": [],
        "right": [],
    }

    async with aiosqlite.connect(settings.db_path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT sensor_type, payload FROM sensor_readings"
            " WHERE mission_id = ?",
            (mission_id,),
        ) as cursor:
            rows = await cursor.fetchall()

    count_gas = 0
    count_ultrasonic = 0
    for row in rows:
        try:
            payload = json.loads(row["payload"])
        except (json.JSONDecodeError, TypeError):
            continue
        if row["sensor_type"] == "gas":
            count_gas += 1
            if isinstance(payload.get("co_level"), (int, float)):
                co_levels.append(float(payload["co_level"]))
            if isinstance(payload.get("air_quality"), (int, float)):
                air_qualities.append(float(payload["air_quality"]))
        elif row["sensor_type"] == "ultrasonic":
            count_ultrasonic += 1
            for direction in ("front", "back", "left", "right"):
                value = payload.get(direction)
                if isinstance(value, (int, float)):
                    ultrasonics[direction].append(float(value))

    return {
        "count_gas": count_gas,
        "count_ultrasonic": count_ultrasonic,
        "co_level": _stats(co_levels),
        "air_quality": _stats(air_qualities),
        "ultrasonic": {
            direction: _stats(values)
            for direction, values in ultrasonics.items()
        },
    }


async def list_timed_out_missions(timeout_seconds: int) -> list[int]:
    """Retourne les IDs des missions manuelles inactives depuis > timeout_seconds."""
    cutoff = datetime.now(timezone.utc).timestamp() - timeout_seconds
    async with aiosqlite.connect(settings.db_path) as db:
        async with db.execute(
            "SELECT id, last_command_at FROM missions"
            " WHERE status='running' AND type='manual'"
        ) as cursor:
            rows = await cursor.fetchall()
    stale: list[int] = []
    for row in rows:
        if not row[1]:
            continue
        try:
            ts = datetime.fromisoformat(row[1]).timestamp()
        except ValueError:
            continue
        if ts < cutoff:
            stale.append(row[0])
    return stale

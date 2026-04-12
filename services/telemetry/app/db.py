"""Accès SQLite async pour la persistance des lectures de capteurs."""

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
    timestamp TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sensor_type_ts
    ON sensor_readings (sensor_type, timestamp DESC);
"""


async def init_db() -> None:
    """Crée le fichier DB et la table si nécessaire."""
    Path(settings.db_path).parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(settings.db_path) as db:
        await db.executescript(SCHEMA)
        await db.commit()
    logger.info("Base SQLite initialisée : %s", settings.db_path)


async def insert_reading(sensor_type: str, topic: str, payload: dict) -> None:
    """Insère une lecture de capteur avec timestamp UTC ISO."""
    ts = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(settings.db_path) as db:
        await db.execute(
            "INSERT INTO sensor_readings (sensor_type, topic, payload, timestamp)"
            " VALUES (?, ?, ?, ?)",
            (sensor_type, topic, json.dumps(payload), ts),
        )
        await db.commit()


async def fetch_history(
    sensor_type: str | None = None,
    limit: int = 100,
) -> list[dict]:
    """Retourne les dernières lectures, filtrables par type de capteur."""
    query = (
        "SELECT id, sensor_type, topic, payload, timestamp"
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
        }
        for row in rows
    ]

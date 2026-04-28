"""Génération de rapports PDF via WeasyPrint."""

from datetime import datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

TEMPLATES_DIR = Path(__file__).parent / "templates"

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)

TYPE_LABELS = {"manual": "Manuelle", "autonomous": "Autonome"}
STATUS_LABELS = {
    "running": "En cours",
    "completed": "Terminée",
    "interrupted": "Interrompue",
    "timeout": "Timeout",
}


def _format_iso(iso_str: str | None) -> str | None:
    """Formate un timestamp ISO en JJ/MM/AAAA HH:MM:SS."""
    if not iso_str:
        return None
    try:
        return datetime.fromisoformat(iso_str).strftime("%d/%m/%Y %H:%M:%S")
    except ValueError:
        return iso_str


def _format_duration(seconds: int | None) -> str | None:
    """Formate une durée en 'Xm YYs'."""
    if seconds is None:
        return None
    minutes = seconds // 60
    secs = seconds % 60
    return f"{minutes}m {secs:02d}s"


def render_report_pdf(report: dict) -> bytes:
    """Génère le PDF d'un rapport de mission. Retourne les bytes du PDF."""
    mission = report["mission"]
    summary = report["sensor_summary"]

    stats_rows = [
        {
            "label": "Monoxyde de carbone (CO)",
            "stats": summary.get("co_level"),
            "unit": "ppm",
        },
        {
            "label": "Qualité de l'air",
            "stats": summary.get("air_quality"),
            "unit": "/100",
        },
        {
            "label": "Distance avant",
            "stats": summary["ultrasonic"].get("front"),
            "unit": "cm",
        },
        {
            "label": "Distance arrière",
            "stats": summary["ultrasonic"].get("back"),
            "unit": "cm",
        },
        {
            "label": "Distance gauche",
            "stats": summary["ultrasonic"].get("left"),
            "unit": "cm",
        },
        {
            "label": "Distance droite",
            "stats": summary["ultrasonic"].get("right"),
            "unit": "cm",
        },
    ]

    template = _env.get_template("report.html")
    html_content = template.render(
        mission=mission,
        sensor_summary=summary,
        summary_narrative=report.get("summary_narrative"),
        summary_error=report.get("summary_error"),
        global_evaluation=report.get("global_evaluation"),
        global_evaluation_error=report.get("global_evaluation_error"),
        type_label=TYPE_LABELS.get(mission["type"], mission["type"]),
        status_label=STATUS_LABELS.get(mission["status"], mission["status"]),
        started_at_fmt=_format_iso(mission.get("started_at")) or "—",
        ended_at_fmt=_format_iso(mission.get("ended_at")),
        duration_fmt=_format_duration(report.get("duration_seconds")),
        stats_rows=stats_rows,
        generated_at=datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
    )

    return HTML(string=html_content).write_pdf()

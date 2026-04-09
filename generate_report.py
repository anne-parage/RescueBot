#!/usr/bin/env python3
"""
RescueBot — Générateur automatique de compte-rendu hebdomadaire
================================================================

Supporte 3 modes de génération :
  - Local (Ollama, LM Studio, ou tout serveur compatible OpenAI sur le réseau)
  - Mock (sans aucune IA, compile juste les notes)

Usage :
    python generate_report.py                          # Auto-détecte le provider dispo
    python generate_report.py --provider ollama        # Force Ollama local
    python generate_report.py --provider lmstudio      # Force LM Studio
    python generate_report.py --provider custom --url http://192.168.1.50:8080  # Serveur sur le réseau
    python generate_report.py --mock                   # Mode test sans IA
    python generate_report.py --week 3                 # Rapport de la semaine 3
    python generate_report.py --list-models            # Liste les modèles Ollama disponibles

Configuration rapide :
    Pour Ollama    → installer Ollama (ollama.com) puis : ollama pull llama3.1
    Pour LM Studio → lancer LM Studio avec le serveur local activé
    Pour un PC distant sur le réseau → export CUSTOM_LLM_URL=http://192.168.1.50:11434
"""

import os
import sys
import json
import subprocess
import re
from datetime import datetime, timedelta
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError

# ═══════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
JOURNAL_FILE = os.path.join(PROJECT_DIR, "journal.md")
REPORTS_DIR = os.path.join(PROJECT_DIR, "rapports")

# Date de début du projet (modifie selon ta date réelle)
PROJECT_START_DATE = "2026-04-06"


# URLs des serveurs LLM locaux
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
LMSTUDIO_URL = os.getenv("LMSTUDIO_URL", "http://localhost:1234")
CUSTOM_LLM_URL = os.getenv("CUSTOM_LLM_URL", "")

# Modèles par défaut
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")
LMSTUDIO_MODEL = os.getenv("LMSTUDIO_MODEL", "default")


# ═══════════════════════════════════════════
# Providers LLM
# ═══════════════════════════════════════════

def check_server_available(url, timeout=3):
    """Vérifie si un serveur HTTP répond."""
    try:
        req = Request(url, method="GET")
        urlopen(req, timeout=timeout)
        return True
    except:
        return False


def call_openai_compatible(url, model, prompt, timeout=120):
    """
    Appelle n'importe quel serveur compatible avec l'API OpenAI.
    Fonctionne avec : Ollama, LM Studio, vLLM, LocalAI, text-generation-webui, etc.
    """
    endpoint = f"{url.rstrip('/')}/v1/chat/completions"

    payload = json.dumps({
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 2000,
    }).encode("utf-8")

    req = Request(endpoint, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")

    response = urlopen(req, timeout=timeout)
    data = json.loads(response.read().decode("utf-8"))

    return data["choices"][0]["message"]["content"]


def call_ollama_native(prompt, model=None, timeout=120):
    """
    Appelle Ollama via son API native /api/generate.
    Fallback si l'endpoint OpenAI-compatible ne marche pas.
    """
    model = model or OLLAMA_MODEL
    endpoint = f"{OLLAMA_URL}/api/generate"

    payload = json.dumps({
        "model": model,
        "prompt": prompt,
        "stream": False,
    }).encode("utf-8")

    req = Request(endpoint, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")

    response = urlopen(req, timeout=timeout)
    data = json.loads(response.read().decode("utf-8"))

    return data.get("response", "")



def list_ollama_models(url=None):
    """Liste les modèles disponibles dans Ollama."""
    target = url or OLLAMA_URL
    try:
        req = Request(f"{target}/api/tags", method="GET")
        response = urlopen(req, timeout=5)
        data = json.loads(response.read().decode("utf-8"))
        models = [m["name"] for m in data.get("models", [])]
        return models
    except:
        return []


def detect_provider():
    """Auto-détecte le meilleur provider disponible."""

    # 1. Ollama local
    if check_server_available(f"{OLLAMA_URL}/api/tags"):
        models = list_ollama_models()
        if models:
            print(f" Ollama détecté ({OLLAMA_URL})")
            print(f"     Modèles : {', '.join(models[:5])}")
            return "ollama"
        else:
            print(f"  ⚠️  Ollama lancé mais aucun modèle. Lance : ollama pull llama3.1")

    # 2. LM Studio
    if check_server_available(f"{LMSTUDIO_URL}/v1/models"):
        print(f" LM Studio détecté ({LMSTUDIO_URL})")
        return "lmstudio"

    # 3. Serveur custom sur le réseau
    if CUSTOM_LLM_URL:
        if check_server_available(f"{CUSTOM_LLM_URL}/api/tags"):
            models = list_ollama_models(CUSTOM_LLM_URL)
            print(f" Ollama distant détecté ({CUSTOM_LLM_URL})")
            if models:
                print(f"     Modèles : {', '.join(models[:5])}")
            return "custom_ollama"
        elif check_server_available(f"{CUSTOM_LLM_URL}/v1/models"):
            print(f" Serveur OpenAI-compatible détecté ({CUSTOM_LLM_URL})")
            return "custom"
        else:
            print(f"  Serveur custom configuré ({CUSTOM_LLM_URL}) mais ne répond pas")

    print(" Aucun LLM détecté → mode mock")
    return "mock"


def generate_with_provider(provider, prompt, model_override=None, custom_url=None):
    """Génère du texte avec le provider choisi."""

    if provider == "ollama":
        model = model_override or OLLAMA_MODEL
        try:
            return call_openai_compatible(OLLAMA_URL, model, prompt)
        except:
            return call_ollama_native(prompt, model)

    elif provider == "lmstudio":
        model = model_override or LMSTUDIO_MODEL
        return call_openai_compatible(LMSTUDIO_URL, model, prompt)

    elif provider == "custom_ollama":
        url = custom_url or CUSTOM_LLM_URL
        model = model_override or OLLAMA_MODEL
        try:
            return call_openai_compatible(url, model, prompt)
        except:
            endpoint = f"{url.rstrip('/')}/api/generate"
            payload = json.dumps({"model": model, "prompt": prompt, "stream": False}).encode("utf-8")
            req = Request(endpoint, data=payload, method="POST")
            req.add_header("Content-Type", "application/json")
            response = urlopen(req, timeout=120)
            data = json.loads(response.read().decode("utf-8"))
            return data.get("response", "")

    elif provider == "custom":
        url = custom_url or CUSTOM_LLM_URL
        model = model_override or "default"
        return call_openai_compatible(url, model, prompt)

    return None


# ═══════════════════════════════════════════
# Utilitaires projet
# ═══════════════════════════════════════════

def get_current_week_number():
    start = datetime.strptime(PROJECT_START_DATE, "%Y-%m-%d")
    today = datetime.now()
    delta = (today - start).days
    return max(1, (delta // 7) + 1)


def get_week_dates(week_number):
    start = datetime.strptime(PROJECT_START_DATE, "%Y-%m-%d")
    week_start = start + timedelta(weeks=week_number - 1)
    week_end = week_start + timedelta(days=6)
    return week_start, week_end


def get_journal_entries(week_number):
    if not os.path.exists(JOURNAL_FILE):
        return "[Aucune entrée dans le journal cette semaine]"

    week_start, week_end = get_week_dates(week_number)
    start_str = week_start.strftime("%Y-%m-%d")
    end_str = week_end.strftime("%Y-%m-%d")

    with open(JOURNAL_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.split("\n")
    entries = []
    capturing = False

    for line in lines:
        date_match = re.match(r"^##\s+(\d{4}-\d{2}-\d{2})", line)
        if date_match:
            entry_date = date_match.group(1)
            capturing = start_str <= entry_date <= end_str
        if capturing:
            entries.append(line)

    return "\n".join(entries) if entries else "[Aucune entrée dans le journal cette semaine]"


def get_git_log(week_number):
    week_start, week_end = get_week_dates(week_number)
    since = week_start.strftime("%Y-%m-%d")
    until = (week_end + timedelta(days=1)).strftime("%Y-%m-%d")

    try:
        result = subprocess.run(
            ["git", "log", f"--since={since}", f"--until={until}",
             "--pretty=format:%h - %s (%ai)", "--no-merges"],
            capture_output=True, text=True, cwd=PROJECT_DIR
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
        return "[Aucun commit Git cette semaine]"
    except FileNotFoundError:
        return "[Git non disponible]"


# ═══════════════════════════════════════════
# Génération du rapport
# ═══════════════════════════════════════════

def build_prompt(week_number, journal_entries, git_log):
    week_start, week_end = get_week_dates(week_number)

    return f"""Tu es l'assistant d'un étudiant en master qui développe un robot de reconnaissance
(RescueBot) pour son TER. Il doit envoyer un compte-rendu hebdomadaire à son tuteur.

Génère un compte-rendu professionnel mais concis à partir de ses notes et commits.

Le rapport doit contenir :
1. Un résumé de la semaine (3-4 phrases)
2. Ce qui a été réalisé (liste des tâches accomplies)
3. Les problèmes rencontrés et comment ils ont été résolus
4. Ce qui est prévu pour la semaine prochaine
5. Éventuellement des questions pour le tuteur

Informations :
- Projet : RescueBot — Robot de reconnaissance pour les secours
- Architecture : Arduino Mega + ESP32 (WiFi) + Docker sur laptop
- Semaine {week_number} ({week_start.strftime('%d/%m/%Y')} - {week_end.strftime('%d/%m/%Y')})

Notes du journal de la semaine :
{journal_entries}

Commits Git de la semaine :
{git_log}

Génère le rapport en français, au format Markdown. Sois factuel et concis."""


def generate_mock_report(week_number, journal_entries, git_log):
    week_start, week_end = get_week_dates(week_number)
    return f"""# Compte-rendu — Semaine {week_number}
**{week_start.strftime('%d/%m/%Y')} - {week_end.strftime('%d/%m/%Y')}**

## Résumé
[Mode mock — Aucun LLM disponible. Installe Ollama]

## Notes brutes de la semaine
{journal_entries}

## Commits Git
{git_log}

---
*Rapport généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')} (mode mock)*
"""


def save_report(week_number, report_content):
    os.makedirs(REPORTS_DIR, exist_ok=True)
    filename = f"rapport_semaine_{week_number:02d}.md"
    filepath = os.path.join(REPORTS_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(report_content)
    return filepath


# ═══════════════════════════════════════════
# Main
# ═══════════════════════════════════════════

def main():
    import argparse
    parser = argparse.ArgumentParser(
        description="Génère le compte-rendu hebdomadaire RescueBot",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Providers supportés :
  ollama        Ollama local (http://localhost:11434)
  lmstudio      LM Studio local (http://localhost:1234)
  custom        Tout serveur compatible OpenAI sur le réseau (--url)
  mock          Pas d'IA, compile les notes brutes

Variables d'environnement :
  OLLAMA_URL          URL Ollama (défaut: http://localhost:11434)
  OLLAMA_MODEL        Modèle Ollama (défaut: llama3.1)
  LMSTUDIO_URL        URL LM Studio (défaut: http://localhost:1234)
  CUSTOM_LLM_URL      URL serveur custom sur le réseau local

Exemples :
  # Auto-détecte le LLM disponible
  python generate_report.py

  # Utilise Ollama avec le modèle Mistral
  python generate_report.py --provider ollama --model mistral

  # Utilise un Ollama sur un autre PC du réseau local
  python generate_report.py --provider custom --url http://192.168.1.50:11434

  # Utilise LM Studio
  python generate_report.py --provider lmstudio


        """
    )
    parser.add_argument("--week", type=int, default=None, help="Numéro de la semaine")
    parser.add_argument("--provider", choices=["ollama", "lmstudio", "custom", "mock"],
                        default=None, help="Provider LLM à utiliser")
    parser.add_argument("--model", type=str, default=None, help="Modèle à utiliser")
    parser.add_argument("--url", type=str, default=None,
                        help="URL du serveur LLM (ex: http://192.168.1.50:11434)")
    parser.add_argument("--mock", action="store_true", help="Mode test sans IA")
    parser.add_argument("--list-models", action="store_true", help="Liste les modèles disponibles")
    args = parser.parse_args()

    # Lister les modèles
    if args.list_models:
        url = args.url or OLLAMA_URL
        print(f"📋 Modèles disponibles sur {url} :")
        models = list_ollama_models(url)
        if models:
            for m in models:
                print(f"   - {m}")
        else:
            print("   Aucun modèle trouvé. Le serveur est-il lancé ?")
        return

    # Appliquer les overrides
    if args.url:
        global CUSTOM_LLM_URL
        CUSTOM_LLM_URL = args.url

    week = args.week or get_current_week_number()

    print(f"{'=' * 55}")
    print(f" RescueBot — Rapport Semaine {week}")
    print(f"{'=' * 55}")

    week_start, week_end = get_week_dates(week)
    print(f"  Période : {week_start.strftime('%d/%m/%Y')} → {week_end.strftime('%d/%m/%Y')}")
    print()

    # Détecter le provider
    if args.mock:
        provider = "mock"
        print("  Mode mock forcé")
    elif args.provider:
        provider = args.provider
        if provider == "custom" and args.url:
            # Détecter si c'est un Ollama distant ou un OpenAI-compatible
            if check_server_available(f"{args.url}/api/tags"):
                provider = "custom_ollama"
        print(f"  Provider : {provider}")
    else:
        print("  Détection automatique du LLM...")
        provider = detect_provider()
    print()

    # Récupérer les données
    print("Lecture du journal...")
    journal = get_journal_entries(week)

    print("Lecture des commits Git...")
    git_log = get_git_log(week)

    # Générer
    model_name = args.model or (OLLAMA_MODEL if "ollama" in provider else None)
    provider_display = provider
    if model_name and provider != "mock":
        provider_display = f"{provider} / {model_name}"
    print(f"🤖 Génération via [{provider_display}]...")

    if provider == "mock":
        report = generate_mock_report(week, journal, git_log)
    else:
        prompt = build_prompt(week, journal, git_log)
        try:
            report = generate_with_provider(provider, prompt, model_override=args.model, custom_url=args.url)
            if not report:
                print("Réponse vide, fallback mock")
                report = generate_mock_report(week, journal, git_log)
        except Exception as e:
            print(f"Erreur : {e}")
            print("   Fallback mock...")
            report = generate_mock_report(week, journal, git_log)

    # Sauvegarder
    print("Sauvegarde...")
    filepath = save_report(week, report)

    print()
    print(f"Rapport sauvegardé : {filepath}")
    print()
    print("─" * 55)
    print(report)
    print("─" * 55)


if __name__ == "__main__":
    main()

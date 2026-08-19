# AGENTS.md - RescueBot Project Rules

## Projet & Stack
Robot de reconnaissance pour les secours. Arduino Mega + ESP32 (WiFi) + téléphone Android (caméra DroidCam 16:9) + Docker sur laptop opérateur.
Stack backend: Python 3.11, FastAPI, MQTT (Mosquitto), SQLite, Ollama (LLM).
Stack frontend (à créer dans `services/frontend/`): React 18, Vite, TypeScript strict, Tailwind CSS, Zustand, React Router v6, Recharts, `@dnd-kit`.

Services existants:
- `services/api` (port 8000) — WebSocket, MQTT, proxy LLM, routing HTTP
- `services/telemetry` (port 8003) — persistance SQLite des capteurs et missions
- `services/llm` (port 8001) — proxy vers Ollama (jamais appelé directement par le frontend)
- `services/mqtt` — broker Mosquitto
- `services/frontend` (port 3000)

Code embarqué hors Docker : `arduino/rescuebot_main/`

## Règles Générales
- Toujours respecter les règles dans `.Codex/rules/`.
- À la fin de chaque session : si une nouvelle convention, pattern, décision d'archi ou style a été validée, crée ou mets à jour automatiquement le fichier le plus pertinent dans `.Codex/rules/`. Garde chaque fichier < 80 lignes, ultra-concis.
- Utilise l'import explicite quand tu as besoin d'une règle précise.
- Ne jamais mettre de secrets ni de code sensible ici.
- Utilise le dossier `.Codex/memory/` pour stocker les apprentissages dynamiques de session (MEMORY.md). Mets à jour ce fichier à chaque fin de session (≤ 100 lignes).

## Règles de travail (non négociables)

**Workflow : PLAN → CODE → TEST → VALIDATION HUMAINE → suivant.**
Ne jamais sauter une étape. Ne jamais coder deux choses à la fois.
Si l'étape n'est pas approuvée explicitement par l'utilisateur → on reste dessus.

**Git : l'agent ne commit/push JAMAIS.**
Seul l'utilisateur commit. L'agent propose un nom de commit à la fin de chaque étape validée.

## Import automatique
L'agent charge automatiquement tout le dossier `.Codex/rules/` et applique ce qui est pertinent pour la tâche en cours.

Règles disponibles :

**Méta (à consulter en premier en cas de doute)**
- `hard-rules.md` — règles non négociables (sécurité, design, code, accessibilité)
- `workflow.md` — méthodologie : PLAN → CODE → TEST → VALIDATION humaine → suivant
- `architecture.md` — structure projet, services, topics MQTT, refacto recommandé
- `style.md` — conventions de code Python (backend) et JS/React (frontend)

**Frontend / Design**
- `design-system.md` — tokens CSS, Tailwind config, typographie, palette, animations
- `components.md` — specs des 14 composants React réutilisables
- `screens.md` — layouts des 3 écrans (Opérations, Missions, Debug)

**Backend**
- `backend-corrections.md` — modifications API, table missions, endpoints manquants

**Embarqué**
- `arduino.md` — conventions C++ embarqué, topics MQTT firmware, sécurité obstacle

## Contraintes Matérielles
- Vitesse moteurs bornée à 80-150 PWM, presets uniquement (90/120/150). Risque surchauffe au-dessus.
- Capteurs embarqués: 4x HC-SR04 (ultrason), MQ-7 (CO), MQ-135 (qualité air). Pas de DHT22 (T°/humidité retiré du scope).
- Caméra: téléphone Android avec DroidCam en WiFi (1280×720 cible).
- Communication: ESP32 WiFi → MQTT Mosquitto → Docker sur laptop.
- Sécurité embarquée: arrêt automatique si ultrason avant < 10 cm, géré **côté firmware ESP32/Arduino**. Le dashboard n'est qu'un témoin.

## Style de Travail
Voir `.Codex/rules/workflow.md` pour la méthodologie complète.

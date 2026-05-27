# Simulateur de robot (faux ESP32)

Se fait passer pour le robot sur MQTT : publie les capteurs aux cadences du
firmware réel et réagit aux commandes. Permet de tester toute la chaîne
`MQTT → api → WebSocket → frontend` et la persistance `telemetry` **sans
matériel**.

## Prérequis

Le broker doit tourner :

```bash
docker compose up -d mqtt api telemetry
```

Installer la dépendance (sur la machine hôte, hors Docker) :

```bash
pip install -r tools/robot_sim/requirements.txt
```

## Lancer

```bash
python tools/robot_sim/robot_sim.py
```

Options : `--host` (défaut `localhost`), `--port` (défaut `1883`),
`--scenario` (défaut `normal`).

## Scénarios

Taper la commande + Entrée pendant l'exécution pour basculer :

| Commande     | Effet | Ce que ça teste côté dashboard |
|--------------|-------|--------------------------------|
| `normal`     | Valeurs sûres et stables | Affichage nominal des jauges |
| `obstacle`   | Distance avant < 10 cm | Refus de `forward` + `obstacle_blocked` |
| `co`         | `co_level` > 200 ppm | `AlertModal` (beep + flash rouge) |
| `disconnect` | Robot silencieux | `DisconnectionOverlay` après 10 s |
| `quit`       | Arrête le simulateur | — |

## Vérifier

```bash
# Voir tout le trafic publié
mosquitto_sub -h localhost -t "rescuebot/#" -v

# Vérifier la persistance des lectures
curl http://localhost:8003/history

# Envoyer une commande : le simulateur doit la logger
curl -X POST http://localhost:8000/cmd/move \
  -H "Content-Type: application/json" \
  -d '{"direction":"forward","speed":120}'
```

Pour voir le flux réel dans le frontend (au lieu du mock), lancer le service
`frontend` avec `VITE_MOCK_WS=false`.

## Limite connue

L'API ne s'abonne pas encore à `rescuebot/events/obstacle_blocked`
(voir `.claude/rules/backend-corrections.md` §4) : l'événement est bien publié
par le simulateur mais n'est pas encore relayé au frontend. À câbler à
l'étape 5.

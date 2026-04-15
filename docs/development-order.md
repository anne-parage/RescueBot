# Ordre de développement et pièges à éviter

## Ordre recommandé

Pour limiter les blocages et vérifier l'intégration au fur et à mesure.

### Phase 1 — Fondations (priorité max)

1. **Setup projet frontend** : Vite + React + TS strict + Tailwind + routing
   - `services/frontend/package.json`, `vite.config.ts`, `tsconfig.json`
   - Dépendances : `react`, `react-dom`, `react-router-dom`, `zustand`, `recharts`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@fontsource/inter`
2. **Tokens de design + globals.css** — voir `design-system.md`
3. **Header global** avec indicateur connexion + `StopButton` (sans logique réelle au début, juste visuel)
4. **Routing entre `/operations` et `/missions`**

### Phase 2 — Flux de données

5. **Store Zustand `useRobotStore`** + hook `useWebSocket`
6. **Hook `useRobotState`** (booléens dérivés)
7. **Mock WebSocket** : ajouter un dev server qui pousse des fausses données pour tester sans matériel
8. **Composants capteurs** : `SensorGauge`, `UltrasonicRadar`, `Sparkline`
9. **Assemblage écran Opérations** (colonne gauche + droite, pas encore la vidéo)

### Phase 3 — Contrôles

10. **Hook `useKeyboardControls`**
11. **`ControlPad`** + **`SpeedPresets`**
12. **`StopButton` avec logique réelle** : `POST /cmd/stop`
13. **Corrections backend section 1** (resserrage `speed`) — à faire avant de tester les commandes

### Phase 4 — Vidéo

14. **`VideoStream`** avec intégration DroidCam
15. **Détection de perte vidéo** côté client
16. **`VideoLostOverlay`**

### Phase 5 — Missions

17. **Corrections backend section 2** (table `missions` + endpoints)
18. **Store Zustand `useMissionStore`**
19. **`MissionCard`** + **`MissionList`** + filtres
20. **Écran Missions** layout de base
21. **`PlanStep`** avec drag-and-drop
22. **`NewMissionForm`** avec flow complet (objectif → plan LLM → édition → lancement)
23. **Corrections backend section 3** (timeout auto)
24. **Enregistrement mission manuelle** : bouton REC + timer + arrêt

### Phase 6 — LLM

25. **`ChatBubble`** + **`ChatInput`** + **`ChatView`**
26. **Intégration avec `POST /analyze`**
27. **Animation "en train d'écrire"**

### Phase 7 — Rapports

28. **`MissionReport`** format manuel
29. **`TimelineReport`** pour missions autonomes
30. **`MissionReport`** format autonome complet
31. **Export PDF** (backend + frontend)

### Phase 8 — États critiques et feedback

32. **`AlertModal`** + son d'alerte
33. **`DisconnectionOverlay`**
34. **`Toast`** + **`ToastContainer`** + store `useToastStore`
35. **`Skeleton*`** pour tous les écrans de chargement

### Phase 9 — Debug et finitions

36. **Écran Debug** (`/debug`)
37. **Tests** Vitest sur hooks critiques
38. **Ajustements après tests sur robot physique**

## Pièges à éviter

Liste des erreurs prévisibles, relevées pendant la phase de design.

### 1. Logique de sécurité dans le frontend

Ne jamais implémenter l'arrêt d'urgence obstacle < 10 cm côté dashboard. Ce doit être dans le firmware ESP32/Arduino. Le dashboard n'est qu'un témoin. Si le WebSocket lag, la sécurité doit continuer à fonctionner.

### 2. Latence DroidCam > 500 ms

Tester la latence bout-en-bout dès que la pipeline est en place. Si > 500 ms :
- Afficher un avertissement visible dans le header
- Privilégier les missions autonomes au pilotage manuel
- Documenter dans le mémoire comme limitation

### 3. Floats JavaScript

`0.1 + 0.2` donne `0.30000000000000004`. Toutes les valeurs numériques affichées doivent passer par `Math.round()` ou `toFixed(n)`. Pas d'exception.

### 4. Heartbeat MQTT ≠ Vidéo OK

Le robot peut répondre MQTT mais DroidCam peut avoir coupé (batterie téléphone, app crashée, WiFi instable). Les deux états doivent être suivis séparément :
- `connectionState: 'connected' | 'disconnected' | 'video_lost'`

### 5. ZQSD sur QWERTY

Ne jamais coder `Z` en dur. Utiliser `event.code` (qui est `KeyW` indépendamment de la disposition) et `navigator.keyboard.getLayoutMap()` pour l'affichage. Tester sur un vrai clavier QWERTY.

### 6. Animations en contexte sensible

Respecter `prefers-reduced-motion` pour désactiver REC / pulse / bounce. Certains utilisateurs ont des sensibilités visuelles (migraines, crises). Note dans le mémoire section accessibilité.

### 7. PDF dupliqué avec l'UI

Le rapport PDF doit avoir le même contenu que l'affichage écran. Ne pas dupliquer la logique. Générer les deux depuis le même modèle de données structurées (l'objet `MissionReport` Pydantic).

### 8. Données capteurs effacées en déconnexion

En état `disconnected`, les données capteurs doivent rester visibles mais grisées (opacity 0.35). Ne pas les effacer : l'opérateur a besoin de voir ce qui se passait juste avant la coupure pour diagnostiquer.

### 9. Alertes qui disparaissent seules

L'`AlertModal` ne doit pas se fermer toute seule si la valeur redescend. Acquittement explicite obligatoire. Sinon l'opérateur pourrait rater un pic bref.

### 10. Vidéo 16:9 strict vs espace sous la vidéo

Sur 1920×1080, la vidéo 16:9 en colonne centre laisse de l'espace libre en dessous. Décision : laisser vide (respiration). Ne pas chercher à remplir avec autre chose.

## Tâches matérielles (hors code)

À faire en parallèle du développement frontend :

- **DHT22** : décision projet de retirer le capteur T°/humidité du scope. À justifier dans le mémoire (limitation matérielle ou priorisation).
- **Tester DroidCam** en conditions réelles : latence, autonomie, stabilité WiFi
- **Monter le robot** physiquement
- **Fixer le téléphone** solidement sur le robot
- **Trouver un son d'alerte** (`public/sounds/alert.mp3`) — pas stroboscopique, pas agressif
- **Calibrer MQ-7 et MQ-135** après montage (voir `backend-corrections.md` section 5)
- **Vérifier les seuils CO** contre sources officielles (ATSDR, OSHA) avant mémoire

## Travaux futurs (hors scope TER)

À mentionner dans le mémoire section "Limitations et perspectives" :

- **Cartographie SLAM** — nécessite LIDAR + algorithme dédié
- **Mode sombre** — design actuel light-only
- **Multi-opérateurs** + authentification
- **Historique vidéo enregistré**

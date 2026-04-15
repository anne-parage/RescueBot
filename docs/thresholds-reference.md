# Seuils capteurs — référence

Valeurs à implémenter dans `services/frontend/src/config/thresholds.ts`. Ce fichier est la source unique de vérité ; tout code qui les utilise doit passer par ces constantes.

Les valeurs sont basées sur des références reconnues mais à vérifier avant rédaction du mémoire.

## CO (MQ-7) — critique pour la sécurité

| Plage | État | Justification |
|---|---|---|
| 0 – 35 ppm | Normal | Seuil OSHA exposition professionnelle 8h |
| 35 – 100 ppm | Attention | Apparition maux de tête, nausées |
| 100 – 200 ppm | Alerte | Symptômes marqués en 2-3h, équipement respiratoire requis |
| > 200 ppm | Critique | Danger immédiat, évacuation zone, overlay modal |

**Note** : le capteur MQ-7 n'est pas calibré précisément sans étalonnage. Les valeurs brutes sont des indicateurs relatifs. À mentionner honnêtement dans le mémoire.

## Qualité de l'air (MQ-135)

Indice 0–100 dérivé de la valeur brute (pas de mesure d'un polluant précis).

| Plage | État |
|---|---|
| 70 – 100 | Air propre |
| 40 – 70 | Qualité dégradée |
| 0 – 40 | Air vicié, fumée possible |

Pas de niveau "critique" seul (capteur trop imprécis). Règle combinée : MQ-135 bas + CO qui monte = escalade.

## Distances ultrason (HC-SR04)

| Plage | État |
|---|---|
| > 50 cm | Libre |
| 20 – 50 cm | Proche, ralentissement conseillé |
| 10 – 20 cm | Très proche, arrêt imminent |
| < 10 cm | Obstacle, arrêt d'urgence automatique (côté firmware) |

Valeurs exactes à ajuster après montage du robot selon sa taille et inertie.

## Température et humidité

**Pas de capteur DHT22 dans le scope actuel.** Décision projet (voir MEMORY.md). Le sujet TER initial mentionne ces grandeurs mais elles ne sont pas implémentées. À justifier dans le mémoire (limitation matérielle ou priorisation, à arbitrer par l'auteur).

## Code TypeScript correspondant

```ts
// services/frontend/src/config/thresholds.ts

export type SensorState = 'normal' | 'warning' | 'alert' | 'critical';

/**
 * Configuration de seuils pour un capteur "ascendant" (plus haut = pire).
 * Utilisé pour CO et températures.
 * `critical` est optionnel : tous les capteurs n'ont pas de niveau critique.
 */
export interface AscendingThresholds {
  warning: number;
  alert: number;
  critical?: number;
}

/**
 * Configuration de seuils pour un capteur "descendant" (plus bas = pire).
 * Utilisé pour la qualité de l'air (indice 0-100).
 */
export interface DescendingThresholds {
  warning: number;  // en dessous = warning
  alert: number;    // en dessous = alert
}

export const CO_THRESHOLDS: AscendingThresholds = {
  warning: 35,
  alert: 100,
  critical: 200,
};

export const AIR_QUALITY_THRESHOLDS: DescendingThresholds = {
  warning: 70,
  alert: 40,
};

export const ULTRASONIC_THRESHOLDS = {
  proche: 50,
  tresProche: 20,
  obstacle: 10,
} as const;

/**
 * Calcule l'état pour un capteur où plus haut = pire (CO uniquement dans le scope actuel).
 * Comparaisons strictes (>) : la valeur exacte du seuil reste dans l'état inférieur.
 * Exemple CO : 35 ppm = normal, 36 ppm = warning.
 */
export function getAscendingState(
  value: number,
  thresholds: AscendingThresholds
): SensorState {
  if (thresholds.critical !== undefined && value > thresholds.critical) {
    return 'critical';
  }
  if (value > thresholds.alert) return 'alert';
  if (value > thresholds.warning) return 'warning';
  return 'normal';
}

/**
 * Calcule l'état pour un capteur où plus bas = pire (qualité de l'air).
 * Pas de niveau 'critical' pour ce type de capteur (trop imprécis).
 */
export function getDescendingState(
  value: number,
  thresholds: DescendingThresholds
): SensorState {
  if (value < thresholds.alert) return 'alert';
  if (value < thresholds.warning) return 'warning';
  return 'normal';
}

// Helpers spécialisés pour usage direct dans les composants
export const getCOState = (v: number) => getAscendingState(v, CO_THRESHOLDS);
export const getAirQualityState = (v: number) => getDescendingState(v, AIR_QUALITY_THRESHOLDS);
```

**Conséquence pour `SensorGauge`** : le composant doit accepter une fonction de calcul d'état en prop, pas des seuils bruts, pour gérer les deux logiques (ascendante/descendante). Voir la signature corrigée dans `components.md`.

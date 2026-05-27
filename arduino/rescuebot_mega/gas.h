#ifndef GAS_H
#define GAS_H

// Lecture des capteurs de gaz MQ-7 (CO) et MQ-135 (qualité air),
// avec calibration de baseline stockée en EEPROM.

struct GasReading {
  float coLevel;     // CO en ppm (approx, calibré), planché à 0
  float airQuality;  // score 0-100, décroissant quand l'air se dégrade
};

// Charge les baselines depuis l'EEPROM. À appeler dans setup().
void gasInit();

// Lit les capteurs si la cadence GAS_PERIOD_MS est atteinte.
// Retourne true quand une nouvelle lecture vient d'être produite.
bool gasTick();

// Retourne la dernière lecture calibrée.
GasReading gasGet();

// Lit 5 s d'air ambiant, calcule les baselines et les stocke en EEPROM.
// Routine ponctuelle (déclenchée par bouton ou commande), volontairement
// bloquante le temps de l'échantillonnage.
void gasCalibrate();

// Retourne true une seule fois sur l'appui (front descendant) du bouton calib.
bool gasCalibButtonPressed();

#endif  // GAS_H

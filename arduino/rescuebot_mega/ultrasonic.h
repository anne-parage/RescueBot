#ifndef ULTRASONIC_H
#define ULTRASONIC_H

// Lecture des 4 capteurs HC-SR04 (avant, arrière, gauche, droite).

struct UltrasonicReading {
  float front;
  float back;
  float left;
  float right;
};

// Configure les broches trig/echo. À appeler dans setup().
void ultrasonicInit();

// Effectue une lecture si la cadence ULTRASONIC_PERIOD_MS est atteinte.
// Retourne true quand une nouvelle lecture vient d'être produite.
bool ultrasonicTick();

// Retourne la dernière lecture mesurée (en cm).
UltrasonicReading ultrasonicGet();

#endif  // ULTRASONIC_H

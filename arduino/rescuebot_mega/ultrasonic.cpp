#include <Arduino.h>

#include "config.h"
#include "ultrasonic.h"

static UltrasonicReading reading = {ULTRASONIC_MAX_CM, ULTRASONIC_MAX_CM,
                                    ULTRASONIC_MAX_CM, ULTRASONIC_MAX_CM};
static unsigned long lastRead = 0;

// Déclenche une impulsion et mesure la distance retour sur un capteur.
// Retourne ULTRASONIC_MAX_CM si aucun écho avant le timeout.
static float readDistanceCm(uint8_t trigPin, uint8_t echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  // pulseIn est borné par le timeout (lecture brève, jamais bloquante > 25 ms).
  unsigned long duration = pulseIn(echoPin, HIGH, ULTRASONIC_TIMEOUT_US);
  if (duration == 0) {
    return ULTRASONIC_MAX_CM;
  }

  // Distance = (durée * vitesse du son) / 2. 0.0343 cm/µs à 20 °C.
  float cm = (float)duration * 0.0343 / 2.0;
  if (cm > ULTRASONIC_MAX_CM) {
    cm = ULTRASONIC_MAX_CM;
  }
  return cm;
}

// Mesure filtrée : médiane de ULTRASONIC_SAMPLES pings pour lisser le bruit
// intrinsèque du HC-SR04, sans introduire de latence (contrairement à une
// moyenne glissante) — la valeur reste réactive quand un objet se rapproche.
static float readDistanceMedianCm(uint8_t trigPin, uint8_t echoPin) {
  float samples[ULTRASONIC_SAMPLES];
  for (uint8_t i = 0; i < ULTRASONIC_SAMPLES; i++) {
    samples[i] = readDistanceCm(trigPin, echoPin);
    if (i < ULTRASONIC_SAMPLES - 1) {
      delayMicroseconds(ULTRASONIC_PING_GAP_US);
    }
  }

  // Tri par insertion (tableau minuscule), puis retour de l'élément central.
  for (uint8_t i = 1; i < ULTRASONIC_SAMPLES; i++) {
    float key = samples[i];
    int8_t j = (int8_t)i - 1;
    while (j >= 0 && samples[j] > key) {
      samples[j + 1] = samples[j];
      j--;
    }
    samples[j + 1] = key;
  }
  return samples[ULTRASONIC_SAMPLES / 2];
}

void ultrasonicInit() {
  pinMode(PIN_TRIG_FRONT, OUTPUT);
  pinMode(PIN_ECHO_FRONT, INPUT);
  pinMode(PIN_TRIG_BACK, OUTPUT);
  pinMode(PIN_ECHO_BACK, INPUT);
  pinMode(PIN_TRIG_LEFT, OUTPUT);
  pinMode(PIN_ECHO_LEFT, INPUT);
  pinMode(PIN_TRIG_RIGHT, OUTPUT);
  pinMode(PIN_ECHO_RIGHT, INPUT);
}

bool ultrasonicTick() {
  unsigned long now = millis();
  if (now - lastRead < ULTRASONIC_PERIOD_MS) {
    return false;
  }
  lastRead = now;

  // Pause entre capteurs : laisse l'écho du capteur précédent se dissiper avant
  // le tir suivant, sinon le capteur d'après le capte (crosstalk = valeurs bimodales).
  reading.front = readDistanceMedianCm(PIN_TRIG_FRONT, PIN_ECHO_FRONT);
  delayMicroseconds(ULTRASONIC_SENSOR_GAP_US);
  reading.back = readDistanceMedianCm(PIN_TRIG_BACK, PIN_ECHO_BACK);
  delayMicroseconds(ULTRASONIC_SENSOR_GAP_US);
  reading.left = readDistanceMedianCm(PIN_TRIG_LEFT, PIN_ECHO_LEFT);
  delayMicroseconds(ULTRASONIC_SENSOR_GAP_US);
  reading.right = readDistanceMedianCm(PIN_TRIG_RIGHT, PIN_ECHO_RIGHT);
  return true;
}

UltrasonicReading ultrasonicGet() {
  return reading;
}

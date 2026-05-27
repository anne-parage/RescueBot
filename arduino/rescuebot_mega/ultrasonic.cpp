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

  reading.front = readDistanceCm(PIN_TRIG_FRONT, PIN_ECHO_FRONT);
  reading.back = readDistanceCm(PIN_TRIG_BACK, PIN_ECHO_BACK);
  reading.left = readDistanceCm(PIN_TRIG_LEFT, PIN_ECHO_LEFT);
  reading.right = readDistanceCm(PIN_TRIG_RIGHT, PIN_ECHO_RIGHT);
  return true;
}

UltrasonicReading ultrasonicGet() {
  return reading;
}

// RescueBot — firmware Arduino Mega
// Cerveau temps réel : lecture des capteurs, pilotage moteurs et sécurité
// obstacle. Communique avec l'ESP32 (pont WiFi/MQTT) via Serial1.
//
// Sous-étape 5.1 : capteurs uniquement (ultrason + gaz + calibration).
// Sortie sur le moniteur série USB pour validation sans ESP32.

#include "config.h"
#include "gas.h"
#include "ultrasonic.h"

void setup() {
  Serial.begin(SERIAL_DEBUG_BAUD);
  ultrasonicInit();
  gasInit();
  Serial.println("[MEGA] Démarré — étape 5.1 (capteurs)");
}

void loop() {
  // Calibration des gaz sur appui du bouton (lit 5 s d'air ambiant).
  if (gasCalibButtonPressed()) {
    gasCalibrate();
  }

  // Lecture ultrason (toutes les 200 ms) -> log debug.
  if (ultrasonicTick()) {
    UltrasonicReading u = ultrasonicGet();
    char buf[80];
    char f[8];
    char b[8];
    char l[8];
    char r[8];
    // dtostrf : snprintf %f n'est pas supporté sur AVR (Mega).
    dtostrf(u.front, 0, 1, f);
    dtostrf(u.back, 0, 1, b);
    dtostrf(u.left, 0, 1, l);
    dtostrf(u.right, 0, 1, r);
    snprintf(buf, sizeof(buf), "[US] front=%s back=%s left=%s right=%s", f, b, l, r);
    Serial.println(buf);
  }

  // Lecture gaz (toutes les 500 ms) -> log debug.
  if (gasTick()) {
    GasReading g = gasGet();
    char buf[60];
    char co[8];
    char aq[8];
    dtostrf(g.coLevel, 0, 1, co);
    dtostrf(g.airQuality, 0, 1, aq);
    snprintf(buf, sizeof(buf), "[GAS] co=%s ppm air=%s/100", co, aq);
    Serial.println(buf);
  }
}

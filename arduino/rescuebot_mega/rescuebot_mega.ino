// RescueBot — firmware Arduino Mega
// Cerveau temps réel : lecture des capteurs, pilotage moteurs et sécurité
// obstacle. Communique avec l'ESP32 (pont WiFi/MQTT) via Serial1.
//
// Sous-étape 5.2 : capteurs + moteurs (DRI0044/TB6612) + sécurité obstacle.
// Banc d'essai clavier via le moniteur série USB (z/s/q/d/x), TEMPORAIRE :
// remplacé en 5.3 par la réception des commandes depuis l'ESP32.

#include "config.h"
#include "gas.h"
#include "motors.h"
#include "ultrasonic.h"

// Banc d'essai : pilote les moteurs depuis une touche du moniteur série.
static void handleTestKey(char c, float frontCm) {
  switch (c) {
    case 'z':
      motorsMove("forward", 120, frontCm);
      break;
    case 's':
      motorsMove("backward", 120, frontCm);
      break;
    case 'q':
      motorsMove("left", 120, frontCm);
      break;
    case 'd':
      motorsMove("right", 120, frontCm);
      break;
    case 'x':
      motorsStop();
      break;
    default:
      break;  // ignore les retours à la ligne et autres touches
  }
}

void setup() {
  Serial.begin(SERIAL_DEBUG_BAUD);
  ultrasonicInit();
  gasInit();
  motorsInit();
  Serial.println("[MEGA] Démarré — étape 5.2 (capteurs + moteurs)");
  Serial.println("[MEGA] Test clavier : z=avant s=arrière q=gauche d=droite x=stop");
}

void loop() {
  // Calibration des gaz sur appui du bouton (lit 5 s d'air ambiant).
  if (gasCalibButtonPressed()) {
    gasCalibrate();
  }

  // Lecture ultrason (toutes les 200 ms).
  bool newUltrasonic = ultrasonicTick();
  UltrasonicReading u = ultrasonicGet();

  // Sécurité continue : arrêt d'urgence si on avance vers un obstacle proche.
  motorsTick(u.front);

  // Banc d'essai clavier (sera remplacé par les commandes ESP32 en 5.3).
  if (Serial.available() > 0) {
    char c = Serial.read();
    handleTestKey(c, u.front);
  }

  // Log debug ultrason.
  if (newUltrasonic) {
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

  // Log debug gaz (toutes les 500 ms).
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

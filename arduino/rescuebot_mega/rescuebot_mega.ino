// RescueBot — firmware Arduino Mega
// Cerveau temps réel : lecture des capteurs, pilotage moteurs et sécurité
// obstacle. Communique avec l'ESP32 (pont WiFi/MQTT) via Serial1.
//
// Sous-étape 5.3 : reçoit les commandes (M/S/C) de l'ESP32 sur Serial1,
// émet la télémétrie (U/G) et les événements (B). Serial USB = debug.

#include "config.h"
#include "gas.h"
#include "motors.h"
#include "serial_link.h"
#include "ultrasonic.h"

// Exécute une commande reçue de l'ESP32 (dispatch vers les modules).
static void dispatchCommand(const Command& cmd, float frontCm) {
  switch (cmd.type) {
    case CMD_MOVE: {
      MoveResult res = motorsMove(cmd.direction, cmd.speed, frontCm);
      if (res == MOVE_BLOCKED_OBSTACLE) {
        serialLinkSendObstacleBlocked("forward", frontCm);
      }
      break;
    }
    case CMD_STOP:
      motorsStop();
      break;
    case CMD_CALIBRATE:
      gasCalibrate();
      break;
    case CMD_NONE:
    default:
      break;
  }
}

void setup() {
  Serial.begin(SERIAL_DEBUG_BAUD);
  serialLinkInit();
  ultrasonicInit();
  gasInit();
  motorsInit();
  Serial.println("[MEGA] Démarré — étape 5.3 (lien série ESP32)");
}

void loop() {
  // Calibration des gaz sur appui du bouton (alternative à la commande C).
  if (gasCalibButtonPressed()) {
    gasCalibrate();
  }

  // Lecture ultrason (toutes les 200 ms).
  bool newUltrasonic = ultrasonicTick();
  UltrasonicReading u = ultrasonicGet();

  // Sécurité continue : arrêt d'urgence si on avance vers un obstacle proche.
  motorsTick(u.front);

  // Réception et exécution des commandes de l'ESP32.
  Command cmd = serialLinkPoll();
  dispatchCommand(cmd, u.front);

  // Émission ultrason vers l'ESP32 + log debug USB.
  if (newUltrasonic) {
    serialLinkSendUltrasonic(u);

    char buf[80];
    char f[8];
    char b[8];
    char l[8];
    char r[8];
    dtostrf(u.front, 0, 1, f);
    dtostrf(u.back, 0, 1, b);
    dtostrf(u.left, 0, 1, l);
    dtostrf(u.right, 0, 1, r);
    snprintf(buf, sizeof(buf), "[US] front=%s back=%s left=%s right=%s", f, b, l, r);
    Serial.println(buf);
  }

  // Émission gaz vers l'ESP32 + log debug USB (toutes les 500 ms).
  if (gasTick()) {
    GasReading g = gasGet();
    serialLinkSendGas(g);

    char buf[60];
    char co[8];
    char aq[8];
    dtostrf(g.coLevel, 0, 1, co);
    dtostrf(g.airQuality, 0, 1, aq);
    snprintf(buf, sizeof(buf), "[GAS] co=%s ppm air=%s/100", co, aq);
    Serial.println(buf);
  }
}

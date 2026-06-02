#ifndef SERIAL_LINK_H
#define SERIAL_LINK_H

// Liaison série (Serial2) avec le Mega. Lit la télémétrie (U/G/B) et envoie
// les commandes (M/S/C). Protocole CSV compact, une ligne par message.

enum TelemetryType {
  TELEM_NONE,        // rien reçu ce tour
  TELEM_ULTRASONIC,  // "U,front,back,left,right"
  TELEM_GAS,         // "G,co_level,air_quality"
  TELEM_OBSTACLE     // "B,direction,distance"
};

struct Telemetry {
  TelemetryType type;
  float front, back, left, right;  // TELEM_ULTRASONIC
  float coLevel, airQuality;       // TELEM_GAS
  char direction[12];              // TELEM_OBSTACLE
  float distance;                  // TELEM_OBSTACLE
};

// Démarre Serial2 (broches PIN_LINK_RX/TX). À appeler dans setup().
void serialLinkInit();

// Lit Serial2 sans bloquer. Retourne une télémétrie quand une ligne complète
// vient d'être reçue, sinon TELEM_NONE.
Telemetry serialLinkPoll();

// Envoie les commandes vers le Mega (lignes CSV terminées par '\n').
void serialLinkSendMove(const char* direction, int speed);
void serialLinkSendStop(const char* reason);
void serialLinkSendCalibrate();

#endif  // SERIAL_LINK_H

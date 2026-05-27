#ifndef SERIAL_LINK_H
#define SERIAL_LINK_H

#include "gas.h"
#include "ultrasonic.h"

// Liaison série (Serial1) avec l'ESP32. Protocole CSV compact, une ligne par
// message, terminée par '\n'. Aucun JSON côté Mega (construit par l'ESP32).

enum CommandType {
  CMD_NONE,       // aucune commande reçue ce tour
  CMD_MOVE,       // "M,<direction>,<speed>"
  CMD_STOP,       // "S,<reason>"
  CMD_CALIBRATE   // "C"
};

struct Command {
  CommandType type;
  char direction[12];  // valide pour CMD_MOVE
  int speed;           // valide pour CMD_MOVE
};

// Démarre Serial1. À appeler dans setup().
void serialLinkInit();

// Lit Serial1 sans bloquer. Retourne une commande complète quand une ligne
// vient d'être reçue, sinon une commande de type CMD_NONE.
Command serialLinkPoll();

// Émissions vers l'ESP32 (lignes CSV terminées par '\n').
void serialLinkSendUltrasonic(const UltrasonicReading& u);
void serialLinkSendGas(const GasReading& g);
void serialLinkSendObstacleBlocked(const char* direction, float distance);

#endif  // SERIAL_LINK_H

#include <Arduino.h>
#include <stdlib.h>
#include <string.h>

#include "config.h"
#include "serial_link.h"

// Port matériel dédié à l'ESP32 (broches 18=TX1, 19=RX1 sur le Mega).
#define LINK Serial1

static char rxBuf[32];
static uint8_t rxLen = 0;

void serialLinkInit() {
  LINK.begin(SERIAL_LINK_BAUD);
}

// Écrit une ligne terminée par '\n' (et non "\r\n" comme println).
static void sendLine(const char* line) {
  LINK.print(line);
  LINK.print('\n');
}

// Découpe une ligne CSV reçue en une commande structurée.
static Command parseLine(char* line) {
  Command cmd;
  cmd.type = CMD_NONE;
  cmd.speed = 0;
  cmd.direction[0] = '\0';

  char* tok = strtok(line, ",");
  if (tok == NULL) {
    return cmd;
  }

  if (strcmp(tok, "M") == 0) {
    char* dir = strtok(NULL, ",");
    char* spd = strtok(NULL, ",");
    if (dir != NULL && spd != NULL) {
      strncpy(cmd.direction, dir, sizeof(cmd.direction) - 1);
      cmd.direction[sizeof(cmd.direction) - 1] = '\0';
      cmd.speed = atoi(spd);
      cmd.type = CMD_MOVE;
    }
  } else if (strcmp(tok, "S") == 0) {
    cmd.type = CMD_STOP;
  } else if (strcmp(tok, "C") == 0) {
    cmd.type = CMD_CALIBRATE;
  }
  return cmd;
}

Command serialLinkPoll() {
  Command cmd;
  cmd.type = CMD_NONE;

  while (LINK.available() > 0) {
    char c = LINK.read();
    if (c == '\n' || c == '\r') {
      if (rxLen > 0) {
        rxBuf[rxLen] = '\0';
        rxLen = 0;
        return parseLine(rxBuf);  // une commande par appel
      }
    } else if (rxLen < sizeof(rxBuf) - 1) {
      rxBuf[rxLen++] = c;
    } else {
      rxLen = 0;  // ligne trop longue : on la jette
    }
  }
  return cmd;
}

void serialLinkSendUltrasonic(const UltrasonicReading& u) {
  char buf[48];
  char f[8];
  char b[8];
  char l[8];
  char r[8];
  // dtostrf : %f non supporté par snprintf sur AVR (Mega).
  dtostrf(u.front, 0, 1, f);
  dtostrf(u.back, 0, 1, b);
  dtostrf(u.left, 0, 1, l);
  dtostrf(u.right, 0, 1, r);
  snprintf(buf, sizeof(buf), "U,%s,%s,%s,%s", f, b, l, r);
  sendLine(buf);
}

void serialLinkSendGas(const GasReading& g) {
  char buf[32];
  char co[8];
  char aq[8];
  dtostrf(g.coLevel, 0, 1, co);
  dtostrf(g.airQuality, 0, 1, aq);
  snprintf(buf, sizeof(buf), "G,%s,%s", co, aq);
  sendLine(buf);
}

void serialLinkSendObstacleBlocked(const char* direction, float distance) {
  char buf[32];
  char d[8];
  dtostrf(distance, 0, 1, d);
  snprintf(buf, sizeof(buf), "B,%s,%s", direction, d);
  sendLine(buf);
}

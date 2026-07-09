#include <Arduino.h>
#include <stdlib.h>
#include <string.h>

#include "config.h"
#include "serial_link.h"

// Port matériel dédié au Mega.
#define LINK Serial2

static char rxBuf[48];
static uint8_t rxLen = 0;

void serialLinkInit() {
  LINK.begin(SERIAL_LINK_BAUD, SERIAL_8N1, PIN_LINK_RX, PIN_LINK_TX);
}

static void sendLine(const char* line) {
  LINK.print(line);
  LINK.print('\n');
}

void serialLinkSendMove(const char* direction, int speed) {
  char buf[32];
  snprintf(buf, sizeof(buf), "M,%s,%d", direction, speed);
  sendLine(buf);
}

void serialLinkSendStop(const char* reason) {
  char buf[24];
  snprintf(buf, sizeof(buf), "S,%s", reason);
  sendLine(buf);
}

void serialLinkSendCalibrate() {
  sendLine("C");
}

// Découpe une ligne CSV reçue du Mega en une télémétrie structurée.
static Telemetry parseLine(char* line) {
  Telemetry t;
  t.type = TELEM_NONE;

  char* tok = strtok(line, ",");
  if (tok == NULL) {
    return t;
  }

  if (strcmp(tok, "U") == 0) {
    char* f = strtok(NULL, ",");
    char* b = strtok(NULL, ",");
    char* l = strtok(NULL, ",");
    char* r = strtok(NULL, ",");
    if (f && b && l && r) {
      t.front = atof(f);
      t.back = atof(b);
      t.left = atof(l);
      t.right = atof(r);
      t.type = TELEM_ULTRASONIC;
    }
  } else if (strcmp(tok, "G") == 0) {
    char* co = strtok(NULL, ",");
    char* aq = strtok(NULL, ",");
    if (co && aq) {
      t.coLevel = atof(co);
      t.airQuality = atof(aq);
      t.type = TELEM_GAS;
    }
  } else if (strcmp(tok, "B") == 0) {
    char* dir = strtok(NULL, ",");
    char* dist = strtok(NULL, ",");
    if (dir && dist) {
      strncpy(t.direction, dir, sizeof(t.direction) - 1);
      t.direction[sizeof(t.direction) - 1] = '\0';
      t.distance = atof(dist);
      t.type = TELEM_OBSTACLE;
    }
  }
  return t;
}

Telemetry serialLinkPoll() {
  Telemetry t;
  t.type = TELEM_NONE;

  while (LINK.available() > 0) {
    char c = LINK.read();
#if LINK_DEBUG_ECHO
    Serial.write(c);  // miroir des octets bruts vers l'USB (diagnostic)
#endif
    if (c == '\n' || c == '\r') {
      if (rxLen > 0) {
        rxBuf[rxLen] = '\0';
        rxLen = 0;
        return parseLine(rxBuf);
      }
    } else if (rxLen < sizeof(rxBuf) - 1) {
      rxBuf[rxLen++] = c;
    } else {
      rxLen = 0;  // ligne trop longue : on la jette
    }
  }
  return t;
}

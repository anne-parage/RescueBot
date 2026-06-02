// RescueBot — firmware ESP32
// Pont entre le réseau (WiFi/MQTT, dashboard) et le Mega (série).
// Traduit les commandes MQTT (JSON) en CSV pour le Mega, et la télémétrie
// CSV du Mega en JSON pour MQTT. Fabrique le heartbeat.

#include <ArduinoJson.h>

#include "config.h"
#include "serial_link.h"
#include "wifi_mqtt.h"

static unsigned long lastStatusMs = 0;
static unsigned long lastMegaLineMs = 0;
static bool megaSeen = false;

// Callback MQTT : traduit une commande JSON en commande série pour le Mega.
void onMqttCommand(char* topic, byte* payload, unsigned int length) {
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) {
    Serial.println("[ESP32] JSON commande invalide");
    return;
  }

  if (strcmp(topic, TOPIC_CMD_MOVE) == 0) {
    const char* direction = doc["direction"] | "";
    int speed = doc["speed"] | 0;
    serialLinkSendMove(direction, speed);
  } else if (strcmp(topic, TOPIC_CMD_STOP) == 0) {
    const char* reason = doc["reason"] | "manual";
    serialLinkSendStop(reason);
  } else if (strcmp(topic, TOPIC_CMD_CALIBRATE) == 0) {
    serialLinkSendCalibrate();
  }
}

// Publie la télémétrie reçue du Mega sur le bon topic MQTT (CSV -> JSON).
// %.1f est supporté par snprintf sur ESP32 (contrairement au Mega/AVR).
static void publishTelemetry(const Telemetry& t) {
  char buf[96];
  switch (t.type) {
    case TELEM_ULTRASONIC:
      snprintf(buf, sizeof(buf),
               "{\"front\":%.1f,\"back\":%.1f,\"left\":%.1f,\"right\":%.1f}",
               t.front, t.back, t.left, t.right);
      wifiMqttPublish(TOPIC_ULTRASONIC, buf);
      break;
    case TELEM_GAS:
      snprintf(buf, sizeof(buf),
               "{\"co_level\":%.1f,\"air_quality\":%.1f}",
               t.coLevel, t.airQuality);
      wifiMqttPublish(TOPIC_GAS, buf);
      break;
    case TELEM_OBSTACLE:
      snprintf(buf, sizeof(buf),
               "{\"direction\":\"%s\",\"distance\":%.1f}",
               t.direction, t.distance);
      wifiMqttPublish(TOPIC_OBSTACLE, buf);
      break;
    case TELEM_NONE:
    default:
      break;
  }
}

void setup() {
  Serial.begin(SERIAL_DEBUG_BAUD);
  serialLinkInit();
  wifiMqttInit(onMqttCommand);
  Serial.println("[ESP32] Démarré — étape 5.4 (pont WiFi/MQTT)");
}

void loop() {
  wifiMqttLoop();

  // Télémétrie du Mega -> MQTT.
  Telemetry t = serialLinkPoll();
  if (t.type != TELEM_NONE) {
    lastMegaLineMs = millis();
    megaSeen = true;
    publishTelemetry(t);
  }

  // Heartbeat : status toutes les 2 s, uniquement si le Mega est vivant.
  unsigned long now = millis();
  if (now - lastStatusMs >= STATUS_PERIOD_MS) {
    lastStatusMs = now;
    bool megaAlive = megaSeen && (now - lastMegaLineMs < MEGA_TIMEOUT_MS);
    if (megaAlive && wifiMqttConnected()) {
      char buf[32];
      snprintf(buf, sizeof(buf), "{\"uptime\":%lu}", now / 1000);
      wifiMqttPublish(TOPIC_STATUS, buf);
    }
  }
}

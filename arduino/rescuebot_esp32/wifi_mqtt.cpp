#include <PubSubClient.h>
#include <WiFi.h>

#include "config.h"
#include "secrets.h"
#include "wifi_mqtt.h"

static WiFiClient wifiClient;
static PubSubClient mqtt(wifiClient);
static unsigned long lastReconnectAttempt = 0;
static bool wifiWasConnected = false;

void wifiMqttInit(MqttCommandHandler handler) {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  mqtt.setServer(MQTT_BROKER_IP, MQTT_BROKER_PORT);
  mqtt.setCallback(handler);
  Serial.println("[ESP32] WiFi/MQTT initialisés");
}

// Tente une connexion MQTT et souscrit aux topics de commande.
static bool reconnectMqtt() {
  if (mqtt.connect(MQTT_CLIENT_ID)) {
    mqtt.subscribe(TOPIC_CMD_MOVE);
    mqtt.subscribe(TOPIC_CMD_STOP);
    mqtt.subscribe(TOPIC_CMD_CALIBRATE);
    Serial.println("[MQTT] Connecté + souscrit aux commandes");
  }
  return mqtt.connected();
}

void wifiMqttLoop() {
  // Le WiFi se reconnecte automatiquement (setAutoReconnect).
  bool wifiNow = (WiFi.status() == WL_CONNECTED);

  // Log des transitions WiFi (diagnostic).
  if (wifiNow && !wifiWasConnected) {
    Serial.print("[WiFi] Connecté, IP: ");
    Serial.println(WiFi.localIP());
  } else if (!wifiNow && wifiWasConnected) {
    Serial.println("[WiFi] Déconnecté");
  }
  wifiWasConnected = wifiNow;

  if (!wifiNow) {
    return;
  }

  if (!mqtt.connected()) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > MQTT_RECONNECT_MS) {
      lastReconnectAttempt = now;
      if (!reconnectMqtt()) {
        // state: -4 timeout, -2 réseau injoignable, -1 déconnecté...
        Serial.print("[MQTT] Échec connexion, state=");
        Serial.println(mqtt.state());
      }
    }
    return;
  }

  mqtt.loop();
}

bool wifiMqttConnected() {
  return WiFi.status() == WL_CONNECTED && mqtt.connected();
}

void wifiMqttPublish(const char* topic, const char* payload) {
  if (mqtt.connected()) {
    mqtt.publish(topic, payload);
  }
}

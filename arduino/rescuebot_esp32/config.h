#ifndef CONFIG_H
#define CONFIG_H

// Configuration du firmware ESP32 (pont WiFi/MQTT <-> Mega).
// Les identifiants WiFi sont dans secrets.h (non commité).

// ===== Broker MQTT =====
// IMPORTANT : IP LAN du laptop qui fait tourner Docker (cf. ipconfig).
#define MQTT_BROKER_IP "192.168.1.14"  // IP WiFi du laptop (ipconfig)
#define MQTT_BROKER_PORT 1883
#define MQTT_CLIENT_ID "rescuebot-esp32"
#define MQTT_RECONNECT_MS 3000  // intervalle entre tentatives de reconnexion

// ===== Lien série vers le Mega (Serial2) =====
#define SERIAL_DEBUG_BAUD 115200
#define SERIAL_LINK_BAUD 9600
#define PIN_LINK_RX 16  // Serial2 RX <- Mega TX1 (via diviseur 5V -> 3.3V !)
#define PIN_LINK_TX 17  // Serial2 TX -> Mega RX1

// ===== Heartbeat =====
#define STATUS_PERIOD_MS 2000   // publication du status toutes les 2 s
#define MEGA_TIMEOUT_MS 3000    // au-delà sans ligne reçue : Mega considéré muet

// ===== Topics MQTT =====
#define TOPIC_ULTRASONIC "rescuebot/sensors/ultrasonic"
#define TOPIC_GAS "rescuebot/sensors/gas"
#define TOPIC_STATUS "rescuebot/status"
#define TOPIC_OBSTACLE "rescuebot/events/obstacle_blocked"
#define TOPIC_CMD_MOVE "rescuebot/cmd/move"
#define TOPIC_CMD_STOP "rescuebot/cmd/stop"
#define TOPIC_CMD_CALIBRATE "rescuebot/cmd/calibrate"

#endif  // CONFIG_H

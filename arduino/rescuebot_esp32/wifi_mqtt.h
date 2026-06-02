#ifndef WIFI_MQTT_H
#define WIFI_MQTT_H

#include <Arduino.h>

// Gère la connexion WiFi + MQTT (PubSubClient) et la reconnexion auto.

// Signature du handler appelé à la réception d'un message MQTT (commande).
typedef void (*MqttCommandHandler)(char* topic, byte* payload, unsigned int length);

// Démarre le WiFi et configure le client MQTT. À appeler dans setup().
void wifiMqttInit(MqttCommandHandler handler);

// À appeler à chaque loop : maintient la connexion et traite les messages.
void wifiMqttLoop();

// True si WiFi ET MQTT sont connectés.
bool wifiMqttConnected();

// Publie un payload (texte) sur un topic, si connecté.
void wifiMqttPublish(const char* topic, const char* payload);

#endif  // WIFI_MQTT_H

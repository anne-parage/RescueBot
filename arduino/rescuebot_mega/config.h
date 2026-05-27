#ifndef CONFIG_H
#define CONFIG_H

// Configuration matérielle du firmware Arduino Mega.
// Toutes les broches et seuils sont centralisés ici (aucune valeur magique
// ailleurs dans le code). Ajuster au montage réel du robot.

// ===== Communication série =====
#define SERIAL_DEBUG_BAUD 115200   // Serial (USB) : logs de debug
#define SERIAL_LINK_BAUD 115200    // Serial1 (pins 18/19) : lien vers l'ESP32

// ===== Ultrason HC-SR04 (trig = sortie, echo = entrée) =====
#define PIN_TRIG_FRONT 22
#define PIN_ECHO_FRONT 23
#define PIN_TRIG_BACK 24
#define PIN_ECHO_BACK 25
#define PIN_TRIG_LEFT 26
#define PIN_ECHO_LEFT 27
#define PIN_TRIG_RIGHT 28
#define PIN_ECHO_RIGHT 29

#define ULTRASONIC_PERIOD_MS 200     // cadence de lecture (= cadence publication)
#define ULTRASONIC_MAX_CM 400.0      // portée max retournée si pas d'écho
#define ULTRASONIC_TIMEOUT_US 25000  // timeout pulseIn (~430 cm)

// ===== Gaz (entrées analogiques 0-1023) =====
#define PIN_MQ7 A0    // monoxyde de carbone (CO)
#define PIN_MQ135 A1  // qualité de l'air

#define GAS_PERIOD_MS 500
#define GAS_CALIB_SAMPLES 50         // nombre d'échantillons de calibration
#define GAS_CALIB_DURATION_MS 5000   // durée totale de la calibration

// Mapping brut -> grandeur physique (linéaire, à affiner au montage réel).
// CO : ppm = (brut - baseline) * MQ7_PPM_PER_UNIT, planché à 0.
#define MQ7_PPM_PER_UNIT 0.5
// Qualité air : score 100 (air pur) qui décroît quand le MQ-135 monte.
#define MQ135_QUALITY_MAX 100.0
#define MQ135_QUALITY_SCALE 0.1

// ===== Bouton de calibration =====
#define PIN_CALIB_BTN 30          // INPUT_PULLUP, LOW = appuyé
#define CALIB_DEBOUNCE_MS 50

// ===== EEPROM (persistance des baselines gaz) =====
#define EEPROM_ADDR_MQ7_BASELINE 0    // float, 4 octets
#define EEPROM_ADDR_MQ135_BASELINE 4  // float, 4 octets
#define EEPROM_ADDR_MAGIC 8           // octet de validité
#define EEPROM_MAGIC 0x42             // marqueur : EEPROM déjà calibrée

// ===== Moteurs L298N + sécurité obstacle =====
// Ajoutés en sous-étape 5.2.

#endif  // CONFIG_H

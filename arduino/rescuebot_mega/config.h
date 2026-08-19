#ifndef CONFIG_H
#define CONFIG_H

// Configuration matérielle du firmware Arduino Mega.
// Toutes les broches et seuils sont centralisés ici (aucune valeur magique
// ailleurs dans le code). Ajuster au montage réel du robot.

// ===== Communication série =====
#define SERIAL_DEBUG_BAUD 115200   // Serial (USB) : logs de debug
#define SERIAL_LINK_BAUD 9600      // Serial1 (pins 18/19) : lien vers l'ESP32

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
#define ULTRASONIC_TIMEOUT_US 15000  // timeout pulseIn (~257 cm) — resserré pour
                                     // tenir la cadence malgré les pings multiples
#define ULTRASONIC_SAMPLES 3         // pings par mesure : médiane anti-bruit (impair)
#define ULTRASONIC_PING_GAP_US 1000  // pause entre pings d'un capteur (écho résiduel)
#define ULTRASONIC_SENSOR_GAP_US 3000  // pause entre capteurs : évite le crosstalk
                                       // (l'écho d'un capteur vu par le suivant)

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

// ===== Moteurs — module L298N (double pont en H générique) =====
// Pilotage en 3 broches par canal : IN1/IN2 (sens) + ENA (vitesse PWM).
// Canal A = côté gauche (2 moteurs gauche en parallèle sur OUT1/OUT2).
// Canal B = côté droit  (2 moteurs droit  en parallèle sur OUT3/OUT4).
// Le code ne voit que 2 canaux : "left" et "right".
// Convention sens : IN1=HIGH & IN2=LOW = marche avant ; inverse = arrière ;
// IN1=IN2=LOW = roue libre (stop). Si un côté tourne à l'envers, échanger ses
// deux fils moteur sur OUTx (ou les deux #define INx ci-dessous).
// ENA/ENB doivent être sur des broches PWM du Mega (retirer le cavalier ENA/ENB
// du module L298N pour piloter la vitesse).
#define PIN_MOTOR_ENA_LEFT 5    // ENA — vitesse gauche (broche PWM Mega)
#define PIN_MOTOR_IN1_LEFT 4    // IN1 — sens gauche
#define PIN_MOTOR_IN2_LEFT 8    // IN2 — sens gauche
#define PIN_MOTOR_ENB_RIGHT 6   // ENB — vitesse droite (broche PWM Mega)
#define PIN_MOTOR_IN3_RIGHT 7   // IN3 — sens droite
#define PIN_MOTOR_IN4_RIGHT 9   // IN4 — sens droite

// Niveaux logiques des broches IN pour la marche avant (IN2 = complément).
#define MOTOR_IN_FORWARD HIGH
#define MOTOR_IN_BACKWARD LOW

// Bornes de vitesse PWM (cohérentes avec le backend : 80-150, multiples de 5).
#define SPEED_MIN 80
#define SPEED_MAX 150

// ===== Sécurité obstacle (cm) — règle dure, jamais déléguée au réseau =====
#define OBSTACLE_REFUSE_CM 10  // refuse une commande 'forward' en dessous
#define OBSTACLE_STOP_CM 5     // arrêt d'urgence immédiat en dessous

#endif  // CONFIG_H

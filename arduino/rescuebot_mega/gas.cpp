#include <Arduino.h>
#include <EEPROM.h>

#include "config.h"
#include "gas.h"

static GasReading reading = {0.0, MQ135_QUALITY_MAX};
static unsigned long lastRead = 0;

// Baselines d'air ambiant (valeur brute moyenne lue à la calibration).
static float baselineMQ7 = 0.0;
static float baselineMQ135 = 0.0;

void gasInit() {
  pinMode(PIN_CALIB_BTN, INPUT_PULLUP);

  // Recharge les baselines si l'EEPROM a déjà été calibrée.
  if (EEPROM.read(EEPROM_ADDR_MAGIC) == EEPROM_MAGIC) {
    EEPROM.get(EEPROM_ADDR_MQ7_BASELINE, baselineMQ7);
    EEPROM.get(EEPROM_ADDR_MQ135_BASELINE, baselineMQ135);
    Serial.println("[GAS] Baselines rechargées depuis l'EEPROM");
  } else {
    Serial.println("[GAS] Aucune baseline en EEPROM (calibration requise)");
  }
}

bool gasTick() {
  unsigned long now = millis();
  if (now - lastRead < GAS_PERIOD_MS) {
    return false;
  }
  lastRead = now;

  float raw7 = (float)analogRead(PIN_MQ7);
  float raw135 = (float)analogRead(PIN_MQ135);

  // CO ascendant : écart au-dessus de la baseline, planché à 0.
  float co = (raw7 - baselineMQ7) * MQ7_PPM_PER_UNIT;
  reading.coLevel = co > 0.0 ? co : 0.0;

  // Qualité air descendante : 100 = air pur, décroît quand le MQ-135 monte.
  float quality = MQ135_QUALITY_MAX - (raw135 - baselineMQ135) * MQ135_QUALITY_SCALE;
  if (quality < 0.0) {
    quality = 0.0;
  } else if (quality > MQ135_QUALITY_MAX) {
    quality = MQ135_QUALITY_MAX;
  }
  reading.airQuality = quality;
  return true;
}

GasReading gasGet() {
  return reading;
}

void gasCalibrate() {
  Serial.println("[GAS] Calibration démarrée (5 s, air ambiant)...");

  long sum7 = 0;
  long sum135 = 0;
  int count = 0;
  unsigned long lastSample = 0;
  const unsigned long interval = GAS_CALIB_DURATION_MS / GAS_CALIB_SAMPLES;

  // Échantillonnage rythmé par millis() (pas de delay()), sur la durée totale.
  while (count < GAS_CALIB_SAMPLES) {
    unsigned long now = millis();
    if (now - lastSample >= interval) {
      lastSample = now;
      sum7 += analogRead(PIN_MQ7);
      sum135 += analogRead(PIN_MQ135);
      count++;
    }
  }

  baselineMQ7 = (float)sum7 / GAS_CALIB_SAMPLES;
  baselineMQ135 = (float)sum135 / GAS_CALIB_SAMPLES;

  EEPROM.put(EEPROM_ADDR_MQ7_BASELINE, baselineMQ7);
  EEPROM.put(EEPROM_ADDR_MQ135_BASELINE, baselineMQ135);
  EEPROM.update(EEPROM_ADDR_MAGIC, EEPROM_MAGIC);

  char buf[64];
  char b7[10];
  char b135[10];
  dtostrf(baselineMQ7, 0, 1, b7);
  dtostrf(baselineMQ135, 0, 1, b135);
  snprintf(buf, sizeof(buf), "[GAS] Baselines: MQ7=%s MQ135=%s", b7, b135);
  Serial.println(buf);
}

bool gasCalibButtonPressed() {
  static int lastState = HIGH;
  static unsigned long lastChange = 0;

  int state = digitalRead(PIN_CALIB_BTN);
  unsigned long now = millis();

  // Anti-rebond : on ignore les transitions trop rapprochées.
  if (state != lastState && (now - lastChange) > CALIB_DEBOUNCE_MS) {
    lastChange = now;
    bool pressed = (lastState == HIGH && state == LOW);
    lastState = state;
    return pressed;
  }
  return false;
}

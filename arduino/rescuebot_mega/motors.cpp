#include <Arduino.h>
#include <string.h>

#include "config.h"
#include "motors.h"

// État courant du mouvement (pour la sécurité continue).
static bool movingForward = false;
static int currentSpeed = 0;

// Applique sens + vitesse à un moteur (DIR puis PWM), driver TB6612.
static void applyMotor(uint8_t pwmPin, uint8_t dirPin, bool forward, int pwm) {
  digitalWrite(dirPin, forward ? MOTOR_DIR_FORWARD : MOTOR_DIR_BACKWARD);
  analogWrite(pwmPin, pwm);
}

void motorsInit() {
  pinMode(PIN_MOTOR_PWM_LEFT, OUTPUT);
  pinMode(PIN_MOTOR_DIR_LEFT, OUTPUT);
  pinMode(PIN_MOTOR_PWM_RIGHT, OUTPUT);
  pinMode(PIN_MOTOR_DIR_RIGHT, OUTPUT);
  motorsStop();
}

void motorsStop() {
  analogWrite(PIN_MOTOR_PWM_LEFT, 0);
  analogWrite(PIN_MOTOR_PWM_RIGHT, 0);
  movingForward = false;
  currentSpeed = 0;
}

MoveResult motorsMove(const char* direction, int speed, float frontCm) {
  // Validation vitesse : bornes + multiple de 5 (cohérent avec le backend).
  if (speed < SPEED_MIN || speed > SPEED_MAX || (speed % 5) != 0) {
    Serial.print("[MOTORS] Vitesse invalide: ");
    Serial.println(speed);
    return MOVE_INVALID;
  }

  // SÉCURITÉ (règle dure) : refus d'avancer si obstacle proche.
  if (strcmp(direction, "forward") == 0 && frontCm < OBSTACLE_REFUSE_CM) {
    motorsStop();
    Serial.println("[MOTORS] forward REFUSÉ — obstacle proche");
    return MOVE_BLOCKED_OBSTACLE;
  }

  if (strcmp(direction, "forward") == 0) {
    applyMotor(PIN_MOTOR_PWM_LEFT, PIN_MOTOR_DIR_LEFT, true, speed);
    applyMotor(PIN_MOTOR_PWM_RIGHT, PIN_MOTOR_DIR_RIGHT, true, speed);
    movingForward = true;
  } else if (strcmp(direction, "backward") == 0) {
    applyMotor(PIN_MOTOR_PWM_LEFT, PIN_MOTOR_DIR_LEFT, false, speed);
    applyMotor(PIN_MOTOR_PWM_RIGHT, PIN_MOTOR_DIR_RIGHT, false, speed);
    movingForward = false;
  } else if (strcmp(direction, "left") == 0) {
    // Pivot gauche : roue gauche en arrière, roue droite en avant.
    applyMotor(PIN_MOTOR_PWM_LEFT, PIN_MOTOR_DIR_LEFT, false, speed);
    applyMotor(PIN_MOTOR_PWM_RIGHT, PIN_MOTOR_DIR_RIGHT, true, speed);
    movingForward = false;
  } else if (strcmp(direction, "right") == 0) {
    // Pivot droite : roue gauche en avant, roue droite en arrière.
    applyMotor(PIN_MOTOR_PWM_LEFT, PIN_MOTOR_DIR_LEFT, true, speed);
    applyMotor(PIN_MOTOR_PWM_RIGHT, PIN_MOTOR_DIR_RIGHT, false, speed);
    movingForward = false;
  } else {
    Serial.print("[MOTORS] Direction inconnue: ");
    Serial.println(direction);
    return MOVE_INVALID;
  }

  currentSpeed = speed;
  return MOVE_OK;
}

void motorsTick(float frontCm) {
  // Arrêt d'urgence continu : si on avance et obstacle < seuil critique.
  if (movingForward && frontCm < OBSTACLE_STOP_CM) {
    motorsStop();
    Serial.println("[MOTORS] ARRÊT D'URGENCE — obstacle < seuil critique");
  }
}

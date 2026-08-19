#include <Arduino.h>
#include <string.h>

#include "config.h"
#include "motors.h"

// État courant du mouvement (pour la sécurité continue).
static bool movingForward = false;
static bool movingBackward = false;
static int currentSpeed = 0;

// Applique sens + vitesse à un canal L298N : IN1/IN2 fixent le sens,
// ENA reçoit le PWM de vitesse.
static void applyMotor(uint8_t enaPin, uint8_t in1Pin, uint8_t in2Pin,
                       bool forward, int pwm) {
  digitalWrite(in1Pin, forward ? MOTOR_IN_FORWARD : MOTOR_IN_BACKWARD);
  digitalWrite(in2Pin, forward ? MOTOR_IN_BACKWARD : MOTOR_IN_FORWARD);
  analogWrite(enaPin, pwm);
}

// Les motoréducteurs droits sont montés en miroir des moteurs gauches :
// leur polarité physique doit être inversée pour conserver les directions
// logiques forward/backward communes aux deux côtés.
static void applyRightMotor(bool forward, int pwm) {
  applyMotor(PIN_MOTOR_ENB_RIGHT, PIN_MOTOR_IN3_RIGHT,
             PIN_MOTOR_IN4_RIGHT, !forward, pwm);
}

void motorsInit() {
  pinMode(PIN_MOTOR_ENA_LEFT, OUTPUT);
  pinMode(PIN_MOTOR_IN1_LEFT, OUTPUT);
  pinMode(PIN_MOTOR_IN2_LEFT, OUTPUT);
  pinMode(PIN_MOTOR_ENB_RIGHT, OUTPUT);
  pinMode(PIN_MOTOR_IN3_RIGHT, OUTPUT);
  pinMode(PIN_MOTOR_IN4_RIGHT, OUTPUT);
  motorsStop();
}

void motorsStop() {
  // Vitesse à 0 et broches de sens au repos (roue libre).
  analogWrite(PIN_MOTOR_ENA_LEFT, 0);
  analogWrite(PIN_MOTOR_ENB_RIGHT, 0);
  digitalWrite(PIN_MOTOR_IN1_LEFT, LOW);
  digitalWrite(PIN_MOTOR_IN2_LEFT, LOW);
  digitalWrite(PIN_MOTOR_IN3_RIGHT, LOW);
  digitalWrite(PIN_MOTOR_IN4_RIGHT, LOW);
  movingForward = false;
  movingBackward = false;
  currentSpeed = 0;
}

MoveResult motorsMove(const char* direction, int speed, float frontCm,
                      float backCm) {
  // Validation vitesse : bornes + multiple de 5 (cohérent avec le backend).
  if (speed < SPEED_MIN || speed > SPEED_MAX || (speed % 5) != 0) {
    Serial.print("[MOTORS] Vitesse invalide: ");
    Serial.println(speed);
    return MOVE_INVALID;
  }

  // SÉCURITÉ (règle dure) : refus d'avancer/reculer si obstacle proche.
  if (strcmp(direction, "forward") == 0 && frontCm < OBSTACLE_REFUSE_CM) {
    motorsStop();
    Serial.println("[MOTORS] forward REFUSÉ — obstacle avant proche");
    return MOVE_BLOCKED_OBSTACLE;
  }
  if (strcmp(direction, "backward") == 0 && backCm < OBSTACLE_REFUSE_CM) {
    motorsStop();
    Serial.println("[MOTORS] backward REFUSÉ — obstacle arrière proche");
    return MOVE_BLOCKED_OBSTACLE;
  }

  if (strcmp(direction, "forward") == 0) {
    applyMotor(PIN_MOTOR_ENA_LEFT, PIN_MOTOR_IN1_LEFT, PIN_MOTOR_IN2_LEFT, true, speed);
    applyRightMotor(true, speed);
    movingForward = true;
    movingBackward = false;
  } else if (strcmp(direction, "backward") == 0) {
    applyMotor(PIN_MOTOR_ENA_LEFT, PIN_MOTOR_IN1_LEFT, PIN_MOTOR_IN2_LEFT, false, speed);
    applyRightMotor(false, speed);
    movingForward = false;
    movingBackward = true;
  } else if (strcmp(direction, "left") == 0) {
    // Pivot gauche : côté gauche en arrière, côté droit en avant.
    applyMotor(PIN_MOTOR_ENA_LEFT, PIN_MOTOR_IN1_LEFT, PIN_MOTOR_IN2_LEFT, false, speed);
    applyRightMotor(true, speed);
    movingForward = false;
    movingBackward = false;
  } else if (strcmp(direction, "right") == 0) {
    // Pivot droite : côté gauche en avant, côté droit en arrière.
    applyMotor(PIN_MOTOR_ENA_LEFT, PIN_MOTOR_IN1_LEFT, PIN_MOTOR_IN2_LEFT, true, speed);
    applyRightMotor(false, speed);
    movingForward = false;
    movingBackward = false;
  } else {
    Serial.print("[MOTORS] Direction inconnue: ");
    Serial.println(direction);
    return MOVE_INVALID;
  }

  currentSpeed = speed;
  return MOVE_OK;
}

void motorsTick(float frontCm, float backCm) {
  // Arrêt d'urgence continu : obstacle sous le seuil critique dans le sens
  // de déplacement (avant si on avance, arrière si on recule).
  if (movingForward && frontCm < OBSTACLE_STOP_CM) {
    motorsStop();
    Serial.println("[MOTORS] ARRÊT D'URGENCE — obstacle avant < seuil critique");
  } else if (movingBackward && backCm < OBSTACLE_STOP_CM) {
    motorsStop();
    Serial.println("[MOTORS] ARRÊT D'URGENCE — obstacle arrière < seuil critique");
  }
}

#ifndef MOTORS_H
#define MOTORS_H

// Pilotage des moteurs via le driver DFRobot DRI0044 (TB6612FNG) et
// sécurité obstacle embarquée (jamais déléguée au réseau).

enum MoveResult {
  MOVE_OK,               // commande appliquée
  MOVE_BLOCKED_OBSTACLE, // 'forward'/'backward' refusé : obstacle sous le seuil
  MOVE_INVALID           // direction inconnue ou vitesse hors bornes
};

// Configure les broches DIR/PWM et coupe les moteurs. À appeler dans setup().
void motorsInit();

// Applique une commande de mouvement avec contrôle de sécurité.
// direction : "forward" | "backward" | "left" | "right".
// speed : PWM 80-150 (multiple de 5).
// frontCm / backCm : distances avant/arrière courantes (sécurité obstacle).
MoveResult motorsMove(const char* direction, int speed, float frontCm,
                      float backCm);

// Coupe immédiatement les deux moteurs.
void motorsStop();

// Sécurité continue : à appeler à chaque loop avec les distances avant/arrière.
// Coupe les moteurs si le robot avance vers un obstacle avant, ou recule vers
// un obstacle arrière, sous le seuil critique (OBSTACLE_STOP_CM).
void motorsTick(float frontCm, float backCm);

#endif  // MOTORS_H

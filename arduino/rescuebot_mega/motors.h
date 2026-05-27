#ifndef MOTORS_H
#define MOTORS_H

// Pilotage des moteurs via le driver DFRobot DRI0044 (TB6612FNG) et
// sécurité obstacle embarquée (jamais déléguée au réseau).

enum MoveResult {
  MOVE_OK,               // commande appliquée
  MOVE_BLOCKED_OBSTACLE, // 'forward' refusé : obstacle sous le seuil
  MOVE_INVALID           // direction inconnue ou vitesse hors bornes
};

// Configure les broches DIR/PWM et coupe les moteurs. À appeler dans setup().
void motorsInit();

// Applique une commande de mouvement avec contrôle de sécurité.
// direction : "forward" | "backward" | "left" | "right".
// speed : PWM 80-150 (multiple de 5). frontCm : distance avant courante.
MoveResult motorsMove(const char* direction, int speed, float frontCm);

// Coupe immédiatement les deux moteurs.
void motorsStop();

// Sécurité continue : à appeler à chaque loop avec la distance avant.
// Coupe les moteurs si le robot avance et qu'un obstacle passe sous le
// seuil critique (OBSTACLE_STOP_CM).
void motorsTick(float frontCm);

#endif  // MOTORS_H

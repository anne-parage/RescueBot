export type ConnectionState = 'connected' | 'disconnected' | 'video_lost';

export interface UltrasonicData {
  front: number;
  back: number;
  left: number;
  right: number;
}

export interface GasData {
  co_level: number;
  air_quality: number;
}

export type WSMessageType = 'ultrasonic' | 'gas' | 'status';

export interface WSMessage {
  type: WSMessageType;
  data: UltrasonicData | GasData | Record<string, unknown>;
  timestamp: string;
}

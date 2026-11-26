export interface Vec2 {
  x: number;
  y: number;
}

export interface Body {
  id: string;
  x: number;
  y: number;
  radius: number;
  /** Positive = gravity well, negative = anti-gravity repulsor, 0 = pure bumper */
  mass: number;
  color: string;
  accent?: string;
  rings?: boolean;
  bumper?: boolean;
}

export interface StarCoin {
  x: number;
  y: number;
  collected?: boolean;
}

export interface Portal {
  x: number;
  y: number;
  radius: number;
}

export interface Level {
  number: number;
  name: string;
  section: 'Vectors' | 'Gravity & Bounce' | 'Orbits' | 'Master' | 'Sandbox';
  instructions: string;
  hint?: string;
  launch: Vec2;
  defaultAngle: number;
  defaultSpeed: number;
  bodies: Body[];
  stars?: StarCoin[];
  portal?: Portal;
  /** If set, win by completing this many full 360° loops around body[0] */
  orbitTurns?: number;
  sandbox?: boolean;
}

export interface Probe {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  trail: Vec2[];
  alive: boolean;
  won: boolean;
  reason?: string;
  starsCollected: boolean[];
  /** Accumulated signed angle around primary body (radians) */
  orbitAngle: number;
  lastOrbitTheta: number | null;
  bounces: number;
  time: number;
}

export type StepEvent = 'star' | 'bounce' | 'crash' | 'oob' | 'win';

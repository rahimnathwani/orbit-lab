import type { Body, Level, Probe, StepEvent, Vec2 } from './types';

export const WORLD_W = 800;
export const WORLD_H = 560;
export const G = 180_000;
export const PROBE_RADIUS = 7;

export function createProbe(level: Level, angleDeg: number, speed: number): Probe {
  const rad = (angleDeg * Math.PI) / 180;
  const primary = level.bodies[0];
  const lastOrbitTheta = primary
    ? Math.atan2(level.launch.y - primary.y, level.launch.x - primary.x)
    : null;
  return {
    x: level.launch.x,
    y: level.launch.y,
    vx: Math.cos(rad) * speed,
    vy: Math.sin(rad) * speed,
    ax: 0,
    ay: 0,
    trail: [{ x: level.launch.x, y: level.launch.y }],
    alive: true,
    won: false,
    starsCollected: (level.stars ?? []).map(() => false),
    orbitAngle: 0,
    lastOrbitTheta,
    bounces: 0,
    time: 0,
  };
}

export function computeGravity(x: number, y: number, bodies: Body[]): Vec2 {
  let ax = 0;
  let ay = 0;
  for (const b of bodies) {
    if (b.mass === 0) continue;
    const dx = b.x - x;
    const dy = b.y - y;
    const distSq = dx * dx + dy * dy;
    const minDist = b.radius + 8;
    const clampedSq = Math.max(distSq, minDist * minDist);
    const dist = Math.sqrt(clampedSq);
    const force = (G * b.mass) / clampedSq;
    ax += (dx / dist) * force;
    ay += (dy / dist) * force;
  }
  return { x: ax, y: ay };
}

/**
 * Advances the probe by `dt` seconds using 4 symplectic substeps.
 * Returns events fired during this step (for sound & particle effects).
 */
export function stepProbe(probe: Probe, level: Level, bodies: Body[], dt: number): StepEvent[] {
  const events: StepEvent[] = [];
  if (!probe.alive || probe.won) return events;

  const substeps = 4;
  const h = dt / substeps;

  for (let s = 0; s < substeps; s++) {
    const g = computeGravity(probe.x, probe.y, bodies);
    probe.ax = g.x;
    probe.ay = g.y;
    probe.vx += g.x * h;
    probe.vy += g.y * h;
    probe.x += probe.vx * h;
    probe.y += probe.vy * h;
    probe.time += h;

    // Collisions with bodies
    for (const b of bodies) {
      const dx = probe.x - b.x;
      const dy = probe.y - b.y;
      const dist = Math.hypot(dx, dy);
      const hitDist = b.radius + PROBE_RADIUS;
      if (dist < hitDist) {
        if (b.bumper) {
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          probe.x = b.x + nx * (hitDist + 1);
          probe.y = b.y + ny * (hitDist + 1);
          const dot = probe.vx * nx + probe.vy * ny;
          if (dot < 0) {
            probe.vx = (probe.vx - 2 * dot * nx) * 0.98;
            probe.vy = (probe.vy - 2 * dot * ny) * 0.98;
            probe.bounces++;
            events.push('bounce');
          }
        } else {
          probe.alive = false;
          probe.reason = 'Crashed into a planet!';
          events.push('crash');
          return events;
        }
      }
    }

    // Star coin collection
    const stars = level.stars ?? [];
    for (let i = 0; i < stars.length; i++) {
      if (probe.starsCollected[i]) continue;
      if (Math.hypot(probe.x - stars[i].x, probe.y - stars[i].y) <= 22) {
        probe.starsCollected[i] = true;
        events.push('star');
      }
    }

    // Orbit tracking around primary body
    if (level.orbitTurns && bodies[0]) {
      const primary = bodies[0];
      const theta = Math.atan2(probe.y - primary.y, probe.x - primary.x);
      if (probe.lastOrbitTheta !== null) {
        let dTheta = theta - probe.lastOrbitTheta;
        while (dTheta > Math.PI) dTheta -= Math.PI * 2;
        while (dTheta < -Math.PI) dTheta += Math.PI * 2;
        probe.orbitAngle += dTheta;
      }
      probe.lastOrbitTheta = theta;
      const allStars = probe.starsCollected.every(Boolean);
      if (Math.abs(probe.orbitAngle) >= level.orbitTurns * Math.PI * 2 && allStars) {
        probe.won = true;
        events.push('win');
        return events;
      }
    }

    // Portal goal check
    if (level.portal) {
      const dist = Math.hypot(probe.x - level.portal.x, probe.y - level.portal.y);
      if (dist <= level.portal.radius + PROBE_RADIUS) {
        if (probe.starsCollected.every(Boolean)) {
          probe.won = true;
          events.push('win');
          return events;
        }
      }
    }

    // Out-of-bounds check (generous margin so high elliptical orbits work)
    const margin = level.sandbox ? 420 : 220;
    if (
      probe.x < -margin ||
      probe.x > WORLD_W + margin ||
      probe.y < -margin ||
      probe.y > WORLD_H + margin
    ) {
      probe.alive = false;
      probe.reason = 'Drifted into deep space!';
      events.push('oob');
      return events;
    }
  }

  probe.trail.push({ x: probe.x, y: probe.y });
  if (probe.trail.length > 600) probe.trail.shift();
  return events;
}

/** Fast trajectory preview (returns points for the next ~2.8 seconds). */
export function predictTrajectory(
  level: Level,
  bodies: Body[],
  angleDeg: number,
  speed: number,
  steps = 150,
): Vec2[] {
  const ghost = createProbe(level, angleDeg, speed);
  const pts: Vec2[] = [{ x: ghost.x, y: ghost.y }];
  for (let i = 0; i < steps; i++) {
    stepProbe(ghost, level, bodies, 1 / 60);
    if (i % 2 === 0) pts.push({ x: ghost.x, y: ghost.y });
    if (!ghost.alive || ghost.won) break;
  }
  return pts;
}

/** Runs a full headless simulation up to maxSeconds to verify solvability in tests. */
export function simulateLaunch(
  level: Level,
  angleDeg: number,
  speed: number,
  maxSeconds = 12,
): Probe {
  const probe = createProbe(level, angleDeg, speed);
  const totalSteps = Math.round(maxSeconds * 60);
  for (let i = 0; i < totalSteps && probe.alive && !probe.won; i++) {
    stepProbe(probe, level, level.bodies, 1 / 60);
  }
  return probe;
}

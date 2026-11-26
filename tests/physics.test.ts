import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/data/levels';
import { simulateLaunch } from '../src/sim/physics';

describe('Orbit Lab physics & level solvability', () => {
  for (const lvl of LEVELS) {
    if (lvl.sandbox) continue;
    it(`Level ${lvl.number} (${lvl.name}) has a winning launch trajectory`, () => {
      let solved = false;
      for (let angle = -70; angle <= 50 && !solved; angle += 2) {
        for (let speed = 220; speed <= 480 && !solved; speed += 15) {
          const probe = simulateLaunch(lvl, angle, speed, 10);
          if (probe.won) solved = true;
        }
      }
      expect(solved).toBe(true);
    });
  }
});

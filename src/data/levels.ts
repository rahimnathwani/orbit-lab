import type { Body, Level } from '../sim/types';

export const LEVELS: Level[] = [
  {
    number: 1,
    name: 'First Launch',
    section: 'Vectors',
    instructions: 'Drag the launch arrow on your probe (or tweak Angle & Power) to fly straight into the glowing green portal!',
    hint: 'Aim straight right (0°) with plenty of speed!',
    launch: { x: 130, y: 280 },
    defaultAngle: -20,
    defaultSpeed: 280,
    bodies: [],
    portal: { x: 670, y: 280, radius: 28 },
  },
  {
    number: 2,
    name: 'Gravity Bend',
    section: 'Gravity & Bounce',
    instructions: 'The orange planet pulls your probe downward! Aim slightly ABOVE the portal so gravity curves you right in.',
    hint: 'Try aiming around −28° with Power ~340 and watch the dotted preview curve!',
    launch: { x: 110, y: 260 },
    defaultAngle: 0,
    defaultSpeed: 320,
    bodies: [
      { id: 'p1', x: 400, y: 365, radius: 46, mass: 120, color: '#ff9654', accent: '#ffd0a6' },
    ],
    portal: { x: 690, y: 270, radius: 28 },
  },
  {
    number: 3,
    name: 'Star Collector',
    section: 'Gravity & Bounce',
    instructions: 'Sweep up both golden stars on your way into the portal!',
    hint: 'Use the planet’s gravity to arc gracefully over the top through both stars.',
    launch: { x: 100, y: 320 },
    defaultAngle: -30,
    defaultSpeed: 330,
    bodies: [
      { id: 'p1', x: 400, y: 390, radius: 44, mass: 135, color: '#5fa8ff', accent: '#b8daff' },
    ],
    stars: [
      { x: 270, y: 205 },
      { x: 530, y: 205 },
    ],
    portal: { x: 695, y: 315, radius: 28 },
  },
  {
    number: 4,
    name: 'Gravity Slingshot',
    section: 'Gravity & Bounce',
    instructions: 'The portal is hiding behind a giant ringed planet! Whip around it using a gravity slingshot.',
    hint: 'Aim above the planet (around −38°, Power ~330) so its pull bends your path down into the portal behind it.',
    launch: { x: 110, y: 280 },
    defaultAngle: -20,
    defaultSpeed: 300,
    bodies: [
      { id: 'p1', x: 410, y: 295, radius: 54, mass: 170, color: '#e8a85a', accent: '#ffe1b5', rings: true },
    ],
    stars: [{ x: 410, y: 155 }],
    portal: { x: 675, y: 310, radius: 30 },
  },
  {
    number: 5,
    name: 'Cosmic Pinball',
    section: 'Gravity & Bounce',
    instructions: 'Bounce off the neon pink energy bumper to reach the portal!',
    hint: 'Aim up-right toward the bumper (around −32°) so it ricochets you down into the portal.',
    launch: { x: 120, y: 390 },
    defaultAngle: -10,
    defaultSpeed: 360,
    bodies: [
      { id: 'b1', x: 400, y: 140, radius: 48, mass: 0, color: '#ff5eb8', accent: '#ffc2e6', bumper: true },
    ],
    portal: { x: 675, y: 390, radius: 30 },
  },
  {
    number: 6,
    name: 'Anti-Gravity Moon',
    section: 'Gravity & Bounce',
    instructions: 'Purple anti-gravity moons PUSH probes away instead of pulling! Ride the push to bank straight UP into the portal.',
    hint: 'Fire toward the purple moon (~6°, Power ~400) and let its anti-gravity field bend your probe straight up!',
    launch: { x: 110, y: 310 },
    defaultAngle: -10,
    defaultSpeed: 340,
    bodies: [
      { id: 'ag1', x: 400, y: 390, radius: 42, mass: -65, color: '#a86bff', accent: '#e0c7ff' },
    ],
    stars: [{ x: 338, y: 225 }],
    portal: { x: 335, y: 105, radius: 32 },
  },
  {
    number: 7,
    name: 'Thread the Needle',
    section: 'Gravity & Bounce',
    instructions: 'Fly right between two giant planets whose gravity pulls cancel out in the middle — grab the star along the way!',
    hint: 'Aim straight down the middle (0°)! Because both planets pull equally, the center path stays straight.',
    launch: { x: 100, y: 280 },
    defaultAngle: 12,
    defaultSpeed: 340,
    bodies: [
      { id: 'p1', x: 400, y: 135, radius: 44, mass: 125, color: '#ff7b6b', accent: '#ffc2ba' },
      { id: 'p2', x: 400, y: 425, radius: 44, mass: 125, color: '#55c9e8', accent: '#b8f0ff' },
    ],
    stars: [{ x: 400, y: 280 }],
    portal: { x: 700, y: 280, radius: 28 },
  },
  {
    number: 8,
    name: 'First Orbit',
    section: 'Orbits',
    instructions: 'Lock your probe into a full 360° orbit around the planet without crashing or flying away!',
    hint: 'Launch sideways (0°) at just the right orbital speed (around 340–370). Too slow = crash; too fast = escape!',
    launch: { x: 400, y: 115 },
    defaultAngle: 0,
    defaultSpeed: 240,
    bodies: [
      { id: 'p1', x: 400, y: 280, radius: 48, mass: 120, color: '#4eb3ff', accent: '#b8e2ff' },
    ],
    orbitTurns: 1,
  },
  {
    number: 9,
    name: 'Ring of Stars',
    section: 'Orbits',
    instructions: 'Complete a full orbit while sweeping up all 4 stars around the ringed giant!',
    hint: 'Aim straight right (0°) with Power around 355–370 to trace a near-circular orbit right through all 4 stars.',
    launch: { x: 400, y: 120 },
    defaultAngle: 0,
    defaultSpeed: 280,
    bodies: [
      { id: 'p1', x: 400, y: 280, radius: 46, mass: 120, color: '#f5b041', accent: '#ffe4b5', rings: true },
    ],
    stars: [
      { x: 560, y: 280 },
      { x: 400, y: 440 },
      { x: 240, y: 280 },
      { x: 400, y: 120 },
    ],
    orbitTurns: 1,
  },
  {
    number: 10,
    name: 'Double Orbit',
    section: 'Orbits',
    instructions: 'Can you hold a steady orbit for TWO full laps around the blazing star?',
    hint: 'Keep your speed right in the sweet spot (~365 at 0°) so you don’t drift out on lap 2!',
    launch: { x: 400, y: 115 },
    defaultAngle: 5,
    defaultSpeed: 310,
    bodies: [
      { id: 'sun', x: 400, y: 280, radius: 50, mass: 125, color: '#ffca3a', accent: '#fff2b2' },
    ],
    orbitTurns: 2,
  },
  {
    number: 11,
    name: 'S-Curve Slalom',
    section: 'Master',
    instructions: 'Weave an S-curve around two planets to snag the stars and land in the portal!',
    hint: 'Aim upward-right (~−25°, Power ~360) so the first planet bends you down, then the second bends you back up!',
    launch: { x: 95, y: 310 },
    defaultAngle: -10,
    defaultSpeed: 340,
    bodies: [
      { id: 'p1', x: 295, y: 370, radius: 40, mass: 110, color: '#ff8a65', accent: '#ffd0bf' },
      { id: 'p2', x: 515, y: 185, radius: 40, mass: 110, color: '#4dd0e1', accent: '#b8f3fa' },
    ],
    stars: [
      { x: 295, y: 215 },
      { x: 515, y: 330 },
    ],
    portal: { x: 705, y: 260, radius: 30 },
  },
  {
    number: 12,
    name: 'Gravity & Bumper',
    section: 'Master',
    instructions: 'Combine a bounce off the top bumper with a planet’s pull to reach the portal!',
    hint: 'Bounce off the bumper near −34° (Power ~380) and let gravity pull you across the star into the portal.',
    launch: { x: 110, y: 390 },
    defaultAngle: -25,
    defaultSpeed: 360,
    bodies: [
      { id: 'b1', x: 350, y: 125, radius: 44, mass: 0, color: '#ff5eb8', accent: '#ffc2e6', bumper: true },
      { id: 'p1', x: 530, y: 400, radius: 42, mass: 115, color: '#64b5f6', accent: '#c4e3ff' },
    ],
    stars: [{ x: 510, y: 235 }],
    portal: { x: 700, y: 330, radius: 30 },
  },
  {
    number: 13,
    name: 'Solar System Sandbox',
    section: 'Sandbox',
    instructions: 'Build your own universe! Tap the canvas to drop Planets, Heavy Stars, Anti-Gravity Moons, or Bumpers — or load a preset and launch as many probes as you want!',
    launch: { x: 400, y: 115 },
    defaultAngle: 0,
    defaultSpeed: 365,
    bodies: [
      { id: 'sun', x: 400, y: 280, radius: 48, mass: 120, color: '#ffca3a', accent: '#fff2b2' },
    ],
    sandbox: true,
  },
];

export interface SandboxPreset {
  name: string;
  launch: { x: number; y: number };
  angle: number;
  speed: number;
  bodies: Body[];
}

export const SANDBOX_PRESETS: SandboxPreset[] = [
  {
    name: 'Sunny Orbit',
    launch: { x: 400, y: 115 },
    angle: 0,
    speed: 365,
    bodies: [
      { id: 'sun', x: 400, y: 280, radius: 48, mass: 120, color: '#ffca3a', accent: '#fff2b2' },
    ],
  },
  {
    name: 'Binary Stars',
    launch: { x: 400, y: 95 },
    angle: 0,
    speed: 380,
    bodies: [
      { id: 's1', x: 310, y: 280, radius: 36, mass: 95, color: '#ff8a5b', accent: '#ffd5c2' },
      { id: 's2', x: 490, y: 280, radius: 36, mass: 95, color: '#5ea2ff', accent: '#c7e0ff' },
    ],
  },
  {
    name: 'Pinball Cosmos',
    launch: { x: 110, y: 280 },
    angle: -22,
    speed: 410,
    bodies: [
      { id: 'b1', x: 380, y: 120, radius: 42, mass: 0, color: '#ff5eb8', accent: '#ffc2e6', bumper: true },
      { id: 'b2', x: 640, y: 280, radius: 42, mass: 0, color: '#ff5eb8', accent: '#ffc2e6', bumper: true },
      { id: 'b3', x: 380, y: 440, radius: 42, mass: 0, color: '#ff5eb8', accent: '#ffc2e6', bumper: true },
      { id: 'p1', x: 400, y: 280, radius: 34, mass: 90, color: '#5ce68a', accent: '#c2ffd6' },
    ],
  },
  {
    name: 'Anti-Gravity Slingshot',
    launch: { x: 110, y: 280 },
    angle: 14,
    speed: 340,
    bodies: [
      { id: 'ag1', x: 320, y: 370, radius: 38, mass: -120, color: '#a86bff', accent: '#e0c7ff' },
      { id: 'p1', x: 540, y: 200, radius: 44, mass: 130, color: '#ff9654', accent: '#ffd0a6', rings: true },
    ],
  },
];

import './styles.css';
import { LEVELS, SANDBOX_PRESETS } from './data/levels';
import { createProbe, predictTrajectory, stepProbe, WORLD_H, WORLD_W } from './sim/physics';
import type { Body, Level, Probe, Vec2 } from './sim/types';
import { loadSave, writeSave } from './storage';
import { setMuted, sfx } from './ui/sfx';

const app = document.querySelector<HTMLDivElement>('#app')!;
const ARROW_MIN_LEN = 36;
const ARROW_MAX_LEN = 180;
const SPEED_MIN = 80;
const SPEED_MAX = 540;

function speedToArrowLen(s: number): number {
  return ARROW_MIN_LEN + ((s - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * (ARROW_MAX_LEN - ARROW_MIN_LEN);
}

function arrowLenToSpeed(dist: number): number {
  const t = (dist - ARROW_MIN_LEN) / (ARROW_MAX_LEN - ARROW_MIN_LEN);
  return Math.round(Math.max(SPEED_MIN, Math.min(SPEED_MAX, SPEED_MIN + t * (SPEED_MAX - SPEED_MIN))));
}

// Pre-generate deterministic decorative starfield
const BG_STARS = Array.from({ length: 110 }, (_, i) => {
  const s = (n: number) => Math.abs(Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1;
  return { x: s(1) * WORLD_W, y: s(2) * WORLD_H, r: 0.7 + s(3) * 1.5, a: 0.25 + s(4) * 0.65 };
});

type SandboxTool = 'aim' | 'planet' | 'star' | 'antigrav' | 'bumper' | 'erase';

let save = loadSave();
setMuted(save.muted);

let level: Level = LEVELS.find(l => l.number === save.level) ?? LEVELS[0];
let bodies: Body[] = level.bodies.map(b => ({ ...b }));
let launchPos: Vec2 = { ...level.launch };
let angle = level.defaultAngle;
let speed = level.defaultSpeed;
let probes: Probe[] = [];
let lastTrail: Vec2[] = [];
let lastShot: { angle: number; speed: number } | null = null;
let attempts = 0;
let timeScale = 1;
let sandboxTool: SandboxTool = 'aim';
let hintOpen = false;
let drawerOpen = false;
let helpOpen = false;
let wonModal = false;
let toast: { text: string; kind: 'info' | 'error' } | null = null;
let toastTimer: number | undefined;
let sparks: Array<{ x: number; y: number; vx: number; vy: number; color: string; life: number }> = [];
let animFrame = 0;
let lastTime = 0;
let bodySeq = 1;

function esc(v: unknown): string {
  return String(v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
}

function showToast(text: string, kind: 'info' | 'error' = 'info'): void {
  toast = { text, kind };
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast = null;
    app.querySelector('.toast')?.remove();
  }, 3200);
}

function addSparks(x: number, y: number, color: string, count = 16): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 140;
    sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, color, life: 1 });
  }
}

function selectLevel(n: number): void {
  const next = LEVELS.find(l => l.number === n);
  if (!next) return;
  level = next;
  bodies = level.bodies.map(b => ({ ...b }));
  launchPos = { ...level.launch };
  angle = level.defaultAngle;
  speed = level.defaultSpeed;
  probes = [];
  lastTrail = [];
  lastShot = null;
  attempts = 0;
  sparks = [];
  sandboxTool = 'aim';
  hintOpen = false;
  drawerOpen = false;
  wonModal = false;
  toast = null;
  save.level = level.number;
  writeSave(save);
  render();
}

function activeLevel(): Level {
  return { ...level, launch: launchPos, bodies };
}

function launch(): void {
  const probe = createProbe(activeLevel(), angle, speed);
  if (level.sandbox) {
    probes.push(probe);
    if (probes.length > 10) probes.shift();
  } else {
    probes = [probe];
    attempts++;
    lastShot = { angle: Math.round(angle), speed: Math.round(speed) };
  }
  wonModal = false;
  toast = null;
  sfx.launch();
  addSparks(launchPos.x, launchPos.y, '#47f0ff', 12);
  render();
}

function resetFlight(): void {
  if (probes[0]?.trail.length) lastTrail = [...probes[0].trail];
  probes = [];
  wonModal = false;
  toast = null;
  render();
}

function launchConfetti(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const host = document.createElement('div');
  host.className = 'confetti';
  const colors = ['#47f0ff', '#5ce68a', '#ffd45d', '#ff6ec7', '#a86bff'];
  for (let i = 0; i < 110; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDuration = `${2 + Math.random() * 1.4}s`;
    p.style.animationDelay = `${Math.random() * 0.5}s`;
    p.style.setProperty('--drift', `${(Math.random() * 2 - 1) * 140}px`);
    p.style.setProperty('--spin', `${540 + Math.random() * 720}deg`);
    host.appendChild(p);
  }
  document.body.appendChild(host);
  window.setTimeout(() => host.remove(), 4200);
}

// Canvas rendering
function drawFrame(now: number): void {
  const dt = Math.min(0.033, lastTime ? (now - lastTime) / 1000 : 1 / 60);
  lastTime = now;

  // Step active probes
  const lvl = activeLevel();
  for (const p of probes) {
    if (!p.alive || p.won) continue;
    const events = stepProbe(p, lvl, bodies, dt * timeScale);
    for (const ev of events) {
      if (ev === 'star') {
        sfx.star();
        addSparks(p.x, p.y, '#ffd45d', 18);
      } else if (ev === 'bounce') {
        sfx.bounce();
        addSparks(p.x, p.y, '#ff6ec7', 16);
      } else if (ev === 'crash') {
        sfx.crash();
        addSparks(p.x, p.y, '#ff7666', 24);
        lastTrail = [...p.trail];
        if (!level.sandbox) {
          showToast('Crashed! Tweak your angle or power and launch again.', 'error');
          render();
        }
      } else if (ev === 'oob') {
        lastTrail = [...p.trail];
        if (!level.sandbox) {
          showToast('Drifted into deep space! Try a little less power or a tighter angle.', 'error');
          render();
        }
      } else if (ev === 'win') {
        sfx.win();
        addSparks(p.x, p.y, '#5ce68a', 30);
        if (!save.completed.includes(level.number)) save.completed.push(level.number);
        writeSave(save);
        wonModal = true;
        launchConfetti();
        render();
      }
    }
  }

  // Update sparks
  for (let i = sparks.length - 1; i >= 0; i--) {
    const sp = sparks[i];
    sp.x += sp.vx * dt;
    sp.y += sp.vy * dt;
    sp.life -= dt * 2.2;
    if (sp.life <= 0) sparks.splice(i, 1);
  }

  paintSpace(now);
  updateHud();
  animFrame = requestAnimationFrame(drawFrame);
}

function updateHud(): void {
  const hud = app.querySelector<HTMLElement>('.hud-pill');
  if (!hud) return;
  const p = probes[0];
  if (level.orbitTurns) {
    const turns = p ? Math.min(level.orbitTurns, Math.abs(p.orbitAngle) / (Math.PI * 2)) : 0;
    hud.textContent = `Orbit: ${Math.round((turns / level.orbitTurns) * 100)}%`;
  } else if (level.stars?.length) {
    const got = p ? p.starsCollected.filter(Boolean).length : 0;
    hud.textContent = `★ ${got} / ${level.stars.length}`;
  } else {
    hud.textContent = `Angle ${Math.round(angle)}° · Power ${Math.round(speed)}`;
  }
}

function paintSpace(now: number): void {
  const canvas = app.querySelector<HTMLCanvasElement>('.space-canvas');
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(200, Math.round(rect.width * dpr));
  const h = Math.max(140, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const c = canvas.getContext('2d')!;
  c.save();
  c.clearRect(0, 0, w, h);
  c.scale(w / WORLD_W, h / WORLD_H);

  // Starfield
  for (const st of BG_STARS) {
    const twinkle = 0.75 + 0.25 * Math.sin(now * 0.002 + st.x);
    c.fillStyle = `rgba(220,235,255,${st.a * twinkle})`;
    c.beginPath();
    c.arc(st.x, st.y, st.r, 0, Math.PI * 2);
    c.fill();
  }

  // Last attempt ghost trail (so players learn from their previous shot)
  if (lastTrail.length > 1 && !probes.some(p => p.alive)) {
    c.save();
    c.strokeStyle = 'rgba(200, 220, 255, 0.24)';
    c.lineWidth = 2;
    c.setLineDash([4, 6]);
    c.beginPath();
    lastTrail.forEach((pt, i) => (i === 0 ? c.moveTo(pt.x, pt.y) : c.lineTo(pt.x, pt.y)));
    c.stroke();
    c.restore();
  }

  // Aiming preview: short fading stub on missions (no spoilers!), longer in Sandbox
  if (!probes.some(p => p.alive) || level.sandbox) {
    const previewSteps = level.sandbox ? 140 : 24;
    const preview = predictTrajectory(activeLevel(), bodies, angle, speed, previewSteps);
    c.save();
    c.lineWidth = 2.5;
    c.lineCap = 'round';
    for (let i = 1; i < preview.length; i++) {
      const fade = 1 - i / preview.length;
      c.strokeStyle = `rgba(71, 240, 255, ${(0.55 * fade).toFixed(3)})`;
      c.beginPath();
      c.moveTo(preview[i - 1].x, preview[i - 1].y);
      c.lineTo(preview[i].x, preview[i].y);
      c.stroke();
    }
    c.restore();
  }

  // Bodies (planets, anti-grav moons, bumpers)
  for (const b of bodies) {
    c.save();
    // Gravity field aura
    if (b.mass !== 0) {
      const aura = c.createRadialGradient(b.x, b.y, b.radius * 0.8, b.x, b.y, b.radius * 2.5);
      const rgb = b.mass < 0 ? '168,107,255' : '71,240,255';
      aura.addColorStop(0, `rgba(${rgb},0.22)`);
      aura.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = aura;
      c.beginPath();
      c.arc(b.x, b.y, b.radius * 2.5, 0, Math.PI * 2);
      c.fill();
    }
    // Rings back
    if (b.rings) {
      c.save();
      c.translate(b.x, b.y);
      c.rotate(-0.35);
      c.strokeStyle = 'rgba(255, 224, 170, 0.45)';
      c.lineWidth = 7;
      c.beginPath();
      c.ellipse(0, 0, b.radius * 1.65, b.radius * 0.45, 0, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
    // Planet sphere
    const grad = c.createRadialGradient(
      b.x - b.radius * 0.3,
      b.y - b.radius * 0.3,
      b.radius * 0.15,
      b.x,
      b.y,
      b.radius,
    );
    grad.addColorStop(0, b.accent ?? '#ffffff');
    grad.addColorStop(1, b.color);
    c.fillStyle = grad;
    c.shadowColor = b.color;
    c.shadowBlur = b.bumper ? 18 : 12;
    c.beginPath();
    c.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    c.fill();
    if (b.bumper) {
      c.strokeStyle = '#ffffffcc';
      c.lineWidth = 3;
      c.stroke();
    }
    if (b.mass < 0) {
      c.strokeStyle = '#e5ccff';
      c.lineWidth = 2;
      c.setLineDash([4, 4]);
      c.beginPath();
      c.arc(b.x, b.y, b.radius + 7, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
  }

  // Collectible stars
  const p0 = probes[0];
  (level.stars ?? []).forEach((st, i) => {
    if (p0?.starsCollected[i]) return;
    c.save();
    c.translate(st.x, st.y);
    c.rotate(now * 0.0015 + i);
    c.fillStyle = '#ffd45d';
    c.shadowColor = '#ffd45d';
    c.shadowBlur = 14;
    c.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 === 0 ? 13 : 6;
      const a = (k * Math.PI) / 5;
      if (k === 0) c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath();
    c.fill();
    c.restore();
  });

  // Target portal
  if (level.portal) {
    const pt = level.portal;
    c.save();
    c.translate(pt.x, pt.y);
    c.rotate(now * 0.0025);
    const unlocked = !p0 || p0.starsCollected.every(Boolean);
    const col = unlocked ? '#5ce68a' : '#8094bd';
    c.strokeStyle = col;
    c.shadowColor = col;
    c.shadowBlur = unlocked ? 18 : 6;
    c.lineWidth = 4;
    c.setLineDash([12, 8]);
    c.beginPath();
    c.arc(0, 0, pt.radius, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = unlocked ? 'rgba(92,230,138,0.18)' : 'rgba(128,148,189,0.1)';
    c.beginPath();
    c.arc(0, 0, pt.radius - 4, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  // Launch pad & aim arrow
  c.save();
  c.fillStyle = '#25375e';
  c.strokeStyle = '#47f0ff';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(launchPos.x, launchPos.y, 12, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  if (!probes.some(p => p.alive) || level.sandbox) {
    const rad = (angle * Math.PI) / 180;
    const len = speedToArrowLen(speed);
    const ex = launchPos.x + Math.cos(rad) * len;
    const ey = launchPos.y + Math.sin(rad) * len;
    c.strokeStyle = '#ffd45d';
    c.lineWidth = 3.5;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(launchPos.x, launchPos.y);
    c.lineTo(ex, ey);
    c.stroke();
    // Subtle grab ring at the tip so it invites dragging
    c.fillStyle = 'rgba(255, 212, 93, 0.22)';
    c.beginPath();
    c.arc(ex, ey, 11, 0, Math.PI * 2);
    c.fill();
    // Arrowhead
    c.fillStyle = '#ffd45d';
    c.beginPath();
    c.moveTo(ex, ey);
    c.lineTo(ex - Math.cos(rad - 0.45) * 12, ey - Math.sin(rad - 0.45) * 12);
    c.lineTo(ex - Math.cos(rad + 0.45) * 12, ey - Math.sin(rad + 0.45) * 12);
    c.closePath();
    c.fill();
  }
  c.restore();

  // Probes & trails
  for (const p of probes) {
    if (p.trail.length > 1) {
      c.save();
      c.strokeStyle = '#47f0ff';
      c.shadowColor = '#47f0ff';
      c.shadowBlur = 10;
      c.lineWidth = 3;
      c.lineCap = 'round';
      c.beginPath();
      p.trail.forEach((pt, i) => (i === 0 ? c.moveTo(pt.x, pt.y) : c.lineTo(pt.x, pt.y)));
      c.stroke();
      c.restore();
    }
    if (p.alive) {
      // Optional velocity & gravity vector arrows
      if (save.showVectors) {
        drawVec(c, p.x, p.y, p.vx * 0.14, p.vy * 0.14, '#47f0ff');
        drawVec(c, p.x, p.y, p.ax * 0.08, p.ay * 0.08, '#ff7666');
      }
      c.save();
      c.fillStyle = '#ffffff';
      c.shadowColor = '#47f0ff';
      c.shadowBlur = 14;
      c.beginPath();
      c.arc(p.x, p.y, 7, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }

  // Sparks
  for (const sp of sparks) {
    c.fillStyle = sp.color;
    c.globalAlpha = Math.max(0, sp.life);
    c.beginPath();
    c.arc(sp.x, sp.y, 3 * sp.life, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  c.restore();
}

function drawVec(c: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number, color: string): void {
  const len = Math.hypot(dx, dy);
  if (len < 4) return;
  const clamp = Math.min(len, 65) / len;
  const ex = x + dx * clamp;
  const ey = y + dy * clamp;
  c.save();
  c.strokeStyle = color;
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(ex, ey);
  c.stroke();
  c.restore();
}

function renderHeader(): string {
  const playable = LEVELS.filter(l => !l.sandbox);
  const solved = playable.filter(l => save.completed.includes(l.number)).length;
  const pct = Math.round((solved / playable.length) * 100);
  return `<header>
    <button class="brand" data-action="open-drawer"><span class="brand-dot"></span>ORBIT LAB</button>
    <button class="hdr-prog" data-action="open-drawer"><span class="hp-bar"><i style="width:${pct}%"></i></span><span>${solved}/${playable.length}</span></button>
    <button class="level-pill" data-action="open-drawer">${level.sandbox ? 'Sandbox' : `Mission ${level.number}`} ⌄</button>
    <button class="icon-btn${save.muted ? ' muted' : ''}" data-action="toggle-mute" aria-label="Toggle sound">${save.muted ? '🔇' : '🔊'}</button>
    <button class="icon-btn" data-action="open-help" aria-label="Help">?</button>
  </header>`;
}

function renderPanel(): string {
  const sandboxTools = level.sandbox
    ? `<div class="card">
        <p class="ctrl-title">Sandbox Tools (tap space to place)</p>
        <div class="tool-grid">
          <button class="tool-btn${sandboxTool === 'aim' ? ' active' : ''}" data-action="tool" data-tool="aim">🎯 Aim Probe</button>
          <button class="tool-btn${sandboxTool === 'planet' ? ' active' : ''}" data-action="tool" data-tool="planet">🪐 Add Planet</button>
          <button class="tool-btn${sandboxTool === 'star' ? ' active' : ''}" data-action="tool" data-tool="star">☀️ Heavy Star</button>
          <button class="tool-btn${sandboxTool === 'antigrav' ? ' active' : ''}" data-action="tool" data-tool="antigrav">🟣 Anti-Grav</button>
          <button class="tool-btn${sandboxTool === 'bumper' ? ' active' : ''}" data-action="tool" data-tool="bumper">🩷 Bumper</button>
          <button class="tool-btn${sandboxTool === 'erase' ? ' active' : ''}" data-action="tool" data-tool="erase">🗑 Remove Body</button>
        </div>
        <div class="preset-row">${SANDBOX_PRESETS.map(
          (p, i) => `<button class="preset-btn" data-action="preset" data-preset="${i}">✨ ${esc(p.name)}</button>`,
        ).join('')}</div>
      </div>`
    : '';

  return `<aside class="panel">
    <div>
      <p class="eyebrow">${esc(level.section)} · ${level.sandbox ? 'Free Play' : `Mission ${level.number}`}</p>
      <h1>${esc(level.name)}</h1>
    </div>
    <div class="card">
      <p>${esc(level.instructions)}</p>
      ${level.hint ? `<button class="hint-toggle" data-action="toggle-hint">${hintOpen ? 'Hide hint' : 'Need a hint?'}</button>${hintOpen ? `<div class="hint-box">${esc(level.hint)}</div>` : ''}` : ''}
    </div>
    <div class="card">
      <p class="ctrl-title">Launch Vector (drag on space or fine-tune)</p>
      <div class="ctrl-row">
        <span class="ctrl-label">Angle</span>
        <span class="stepper">
          <button class="step-btn" data-action="adj-angle" data-delta="-1">−</button>
          <span class="step-val">${Math.round(angle)}°</span>
          <button class="step-btn" data-action="adj-angle" data-delta="1">+</button>
        </span>
      </div>
      <input class="range-slider" type="range" min="-180" max="180" step="1" value="${Math.round(angle)}" data-action="slide-angle" aria-label="Launch angle"/>
      <div class="ctrl-row" style="margin-top:10px">
        <span class="ctrl-label">Power</span>
        <span class="stepper">
          <button class="step-btn" data-action="adj-speed" data-delta="-5">−</button>
          <span class="step-val">${Math.round(speed)}</span>
          <button class="step-btn" data-action="adj-speed" data-delta="5">+</button>
        </span>
      </div>
      <input class="range-slider" type="range" min="80" max="540" step="5" value="${Math.round(speed)}" data-action="slide-speed" aria-label="Launch power"/>
      <div class="legend">
        <span><i class="dot" style="background:#47f0ff"></i>Velocity</span>
        <span><i class="dot" style="background:#ff7666"></i>Gravity pull</span>
        ${lastShot && !level.sandbox ? `<span style="color:#c8dcff">Last: ${lastShot.angle}° / ${lastShot.speed}</span>` : ''}
      </div>
    </div>
    ${sandboxTools}
  </aside>`;
}

function renderDrawer(): string {
  const cards = LEVELS.map(l => {
    const done = save.completed.includes(l.number);
    return `<button class="lvl-card${l.number === level.number ? ' selected' : ''}${done ? ' done' : ''}" data-action="select-level" data-level="${l.number}">
      <span class="lvl-num">${done ? '✓' : l.sandbox ? '✦' : l.number}</span>
      <span><b>${esc(l.name)}</b><small>${esc(l.section)}</small></span>
    </button>`;
  }).join('');
  return `<div class="backdrop drawer-backdrop" data-backdrop="close-drawer">
    <div class="drawer" role="dialog" aria-modal="true">
      <div class="drawer-head"><h2>Orbit Lab Missions</h2><button class="icon-btn" data-action="close-drawer">×</button></div>
      <div class="level-grid">${cards}</div>
    </div>
  </div>`;
}

function renderWon(): string {
  if (!wonModal) return '';
  const hasNext = LEVELS.some(l => l.number === level.number + 1);
  const ace = attempts <= 3;
  return `<div class="backdrop" data-backdrop="close-won">
    <section class="modal" role="dialog" aria-modal="true">
      <div style="font-size:44px">${ace ? '🌟' : '🚀'}</div>
      <p class="eyebrow">MISSION ${level.number} COMPLETE${ace ? ' · ★ ACE PILOT' : ''}</p>
      <h2>${esc(level.name)} — nailed it!</h2>
      <p style="color:#cfe0ff;font-size:14px">Solved in <b>${attempts}</b> launch${attempts === 1 ? '' : 'es'} · Angle <b>${Math.round(angle)}°</b> · Power <b>${Math.round(speed)}</b></p>
      ${hasNext ? `<button class="bar-btn launch wide-btn" data-action="next-level">Next Mission →</button>` : ''}
      <button class="text-link" data-action="close-won">Launch again</button>
    </section>
  </div>`;
}

function renderHelp(): string {
  return `<div class="backdrop" data-backdrop="close-help">
    <section class="modal" role="dialog" aria-modal="true" style="text-align:left">
      <p class="eyebrow">HOW TO PLAY</p>
      <h2>Explore gravity &amp; orbits</h2>
      <p style="color:#dbe6fc;line-height:1.5;font-size:14px">
        <b>1. Aim:</b> Drag directly on the starry canvas (or use the Angle &amp; Power sliders) to aim your golden launch arrow. Watch the dotted trajectory preview bend around planets!<br><br>
        <b>2. Launch:</b> Hit <b>Launch</b> and watch live Velocity (cyan) and Gravity (coral) arrows show how forces curve your path.<br><br>
        <b>3. Sandbox:</b> Place your own planets, anti-gravity moons, and bumpers to build custom solar systems!
      </p>
      <button class="bar-btn launch wide-btn" data-action="close-help">Ready for liftoff!</button>
    </section>
  </div>`;
}

function render(): void {
  const flying = probes.some(p => p.alive);
  app.innerHTML = `${renderHeader()}
  <main class="stage">
    <section class="space-wrap">
      <canvas class="space-canvas"></canvas>
      <div class="hud-pill"></div>
      ${toast ? `<div class="toast ${toast.kind}">${esc(toast.text)}</div>` : ''}
      <div class="space-bar">
        ${flying && !level.sandbox ? `<button class="bar-btn stop" data-action="reset">■ Reset</button>` : `<button class="bar-btn launch" data-action="launch">🚀 Launch</button>`}
        ${level.sandbox && probes.length ? `<button class="bar-btn" data-action="reset">Clear Probes</button>` : ''}
        <button class="bar-btn${timeScale === 0.5 ? ' active' : ''}" data-action="speed" data-scale="0.5">0.5×</button>
        <button class="bar-btn${timeScale === 1 ? ' active' : ''}" data-action="speed" data-scale="1">1×</button>
        <button class="bar-btn${timeScale === 2 ? ' active' : ''}" data-action="speed" data-scale="2">2×</button>
        <button class="bar-btn${save.showVectors ? ' active' : ''}" data-action="toggle-vectors">↗ Vectors</button>
      </div>
    </section>
    ${renderPanel()}
  </main>
  ${drawerOpen ? renderDrawer() : ''}
  ${wonModal ? renderWon() : ''}
  ${helpOpen ? renderHelp() : ''}`;
  updateHud();
}

// Canvas pointer interaction (drag to aim, or tap to place bodies in Sandbox)
let aiming = false;

function canvasWorldPos(event: PointerEvent): Vec2 | null {
  const canvas = app.querySelector<HTMLCanvasElement>('.space-canvas');
  if (!canvas) return null;
  const r = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - r.left) / r.width) * WORLD_W,
    y: ((event.clientY - r.top) / r.height) * WORLD_H,
  };
}

function aimToward(pt: Vec2): void {
  const dx = pt.x - launchPos.x;
  const dy = pt.y - launchPos.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 10) return;
  angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
  speed = arrowLenToSpeed(dist);
  // Update sliders without full re-render while dragging
  const aSlider = app.querySelector<HTMLInputElement>('[data-action="slide-angle"]');
  const sSlider = app.querySelector<HTMLInputElement>('[data-action="slide-speed"]');
  if (aSlider) aSlider.value = String(angle);
  if (sSlider) sSlider.value = String(speed);
  const vals = app.querySelectorAll<HTMLElement>('.step-val');
  if (vals[0]) vals[0].textContent = `${angle}°`;
  if (vals[1]) vals[1].textContent = String(speed);
}

app.addEventListener('pointerdown', event => {
  if (!(event.target as HTMLElement).classList.contains('space-canvas')) return;
  const pt = canvasWorldPos(event);
  if (!pt) return;

  if (level.sandbox && sandboxTool !== 'aim') {
    if (sandboxTool === 'erase') {
      bodies = bodies.filter(b => Math.hypot(b.x - pt.x, b.y - pt.y) > b.radius + 10);
    } else if (sandboxTool === 'planet') {
      bodies.push({ id: `u${bodySeq++}`, x: pt.x, y: pt.y, radius: 36, mass: 100, color: '#5fa8ff', accent: '#c2e0ff' });
    } else if (sandboxTool === 'star') {
      bodies.push({ id: `u${bodySeq++}`, x: pt.x, y: pt.y, radius: 48, mass: 165, color: '#ffca3a', accent: '#fff3ba' });
    } else if (sandboxTool === 'antigrav') {
      bodies.push({ id: `u${bodySeq++}`, x: pt.x, y: pt.y, radius: 34, mass: -120, color: '#a86bff', accent: '#e2ccff' });
    } else if (sandboxTool === 'bumper') {
      bodies.push({ id: `u${bodySeq++}`, x: pt.x, y: pt.y, radius: 38, mass: 0, color: '#ff5eb8', accent: '#ffc2e6', bumper: true });
    }
    sfx.star();
    return;
  }

  if (probes.some(p => p.alive) && !level.sandbox) return;
  aiming = true;
  (event.target as HTMLElement).setPointerCapture(event.pointerId);
  aimToward(pt);
});

app.addEventListener('pointermove', event => {
  if (!aiming) return;
  const pt = canvasWorldPos(event);
  if (pt) aimToward(pt);
});

window.addEventListener('pointerup', () => {
  aiming = false;
});

app.addEventListener('click', event => {
  const clicked = event.target as HTMLElement;
  const target = clicked.closest<HTMLElement>('[data-action]') ?? (clicked.dataset.backdrop ? clicked : null);
  if (!target) return;
  const action = target.dataset.action ?? target.dataset.backdrop;

  if (action === 'open-drawer') { drawerOpen = true; render(); }
  else if (action === 'close-drawer') { drawerOpen = false; render(); }
  else if (action === 'open-help') { helpOpen = true; render(); }
  else if (action === 'close-help') { helpOpen = false; render(); }
  else if (action === 'close-won') { wonModal = false; resetFlight(); }
  else if (action === 'select-level') { selectLevel(Number(target.dataset.level)); }
  else if (action === 'next-level') { selectLevel(level.number + 1); }
  else if (action === 'toggle-mute') { save.muted = !save.muted; setMuted(save.muted); writeSave(save); render(); }
  else if (action === 'toggle-hint') { hintOpen = !hintOpen; render(); }
  else if (action === 'toggle-vectors') { save.showVectors = !save.showVectors; writeSave(save); render(); }
  else if (action === 'launch') { launch(); }
  else if (action === 'reset') { resetFlight(); }
  else if (action === 'speed') { timeScale = Number(target.dataset.scale); render(); }
  else if (action === 'adj-angle') {
    angle = Math.max(-180, Math.min(180, angle + Number(target.dataset.delta)));
    render();
  } else if (action === 'adj-speed') {
    speed = Math.max(80, Math.min(540, speed + Number(target.dataset.delta)));
    render();
  } else if (action === 'tool') {
    sandboxTool = target.dataset.tool as SandboxTool;
    render();
  } else if (action === 'preset') {
    const pr = SANDBOX_PRESETS[Number(target.dataset.preset)];
    if (pr) {
      bodies = pr.bodies.map(b => ({ ...b }));
      launchPos = { ...pr.launch };
      angle = pr.angle;
      speed = pr.speed;
      probes = [];
      lastTrail = [];
      sandboxTool = 'aim';
      render();
    }
  }
});

app.addEventListener('input', event => {
  const t = event.target as HTMLInputElement;
  if (t.dataset.action === 'slide-angle') {
    angle = Number(t.value);
    const vals = app.querySelectorAll<HTMLElement>('.step-val');
    if (vals[0]) vals[0].textContent = `${angle}°`;
  } else if (t.dataset.action === 'slide-speed') {
    speed = Number(t.value);
    const vals = app.querySelectorAll<HTMLElement>('.step-val');
    if (vals[1]) vals[1].textContent = String(speed);
  }
});

render();
animFrame = requestAnimationFrame(drawFrame);

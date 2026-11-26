let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(v: boolean): void {
  muted = v;
}

function audio(): AudioContext | null {
  if (muted || typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(
  freq: number,
  duration: number,
  opts: { type?: OscillatorType; gain?: number; endFreq?: number; delay?: number } = {},
): void {
  const c = audio();
  if (!c) return;
  const now = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, now);
  if (opts.endFreq) osc.frequency.exponentialRampToValueAtTime(opts.endFreq, now + duration);
  const peak = opts.gain ?? 0.065;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(peak, now + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export const sfx = {
  launch() {
    tone(220, 0.22, { type: 'triangle', endFreq: 680, gain: 0.07 });
  },
  star() {
    tone(784, 0.12, { type: 'triangle', endFreq: 1175, gain: 0.07 });
  },
  bounce() {
    tone(360, 0.14, { type: 'sine', endFreq: 720, gain: 0.08 });
  },
  crash() {
    tone(180, 0.22, { type: 'sawtooth', endFreq: 65, gain: 0.055 });
  },
  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => tone(f, 0.24, { type: 'triangle', gain: 0.075, delay: i * 0.085 }));
  },
};

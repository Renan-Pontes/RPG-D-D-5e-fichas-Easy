import { getSoundPref } from './dice-prefs.js';

let audioCtx = null;

function ensureCtx() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

export function playRollSting(kind) {
  if (!getSoundPref() || (kind !== 'nat20' && kind !== 'nat1')) return false;
  const ctx = ensureCtx();
  if (!ctx) return false;
  const now = ctx.currentTime;
  const notes = kind === 'nat20' ? [523.25, 659.25, 783.99, 1046.5] : [196.0, 146.83];
  const type = kind === 'nat20' ? 'triangle' : 'sawtooth';
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t0 = now + i * (kind === 'nat20' ? 0.055 : 0.09);
    const dur = kind === 'nat20' ? 0.24 : 0.22;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(kind === 'nat20' ? 0.09 : 0.07, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  });
  return true;
}

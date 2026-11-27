export const SOUNDSCAPES = [
  { id: 'tavern', pt: 'Taverna', en: 'Tavern', icon: '🍺', baseHz: 110, harmonicHz: 164.8, filterHz: 520, lfoHz: 0.22, noise: 0.22 },
  { id: 'dungeon', pt: 'Masmorra', en: 'Dungeon', icon: '🕯️', baseHz: 65.4, harmonicHz: 98, filterHz: 260, lfoHz: 0.11, noise: 0.34 },
  { id: 'forest', pt: 'Floresta', en: 'Forest', icon: '🌲', baseHz: 146.8, harmonicHz: 220, filterHz: 900, lfoHz: 0.18, noise: 0.28 },
  { id: 'storm', pt: 'Tempestade', en: 'Storm', icon: '⛈️', baseHz: 73.4, harmonicHz: 110, filterHz: 640, lfoHz: 0.35, noise: 0.55 },
  { id: 'boss', pt: 'Chefe', en: 'Boss', icon: '⚔️', baseHz: 82.4, harmonicHz: 123.5, filterHz: 420, lfoHz: 0.65, noise: 0.25 },
  { id: 'crypt', pt: 'Cripta', en: 'Crypt', icon: '💀', baseHz: 55, harmonicHz: 82.4, filterHz: 220, lfoHz: 0.08, noise: 0.3 },
];

export function findSoundscape(id) {
  return SOUNDSCAPES.find(s => s.id === id) || null;
}

class SoundscapeEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.active = null;
    this.trackId = null;
    this.volume = 0.35;
    this.playing = false;
  }

  _ensureCtx() {
    if (this.ctx) return this.ctx;
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  _buildLayer(preset) {
    const ctx = this._ensureCtx();
    if (!ctx) return null;
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(1, now + 0.6);
    out.connect(this.master);

    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.value = preset.baseHz;

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = preset.harmonicHz;

    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.16;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = preset.filterHz;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = preset.lfoHz;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = preset.filterHz * 0.25;
    lfo.connect(lfoGain).connect(filter.frequency);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(droneGain).connect(out);

    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.04 * white) / 1.04;
      data[i] = lastOut * 2.4;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.value = preset.filterHz;
    nFilter.Q.value = 0.7;
    const nGain = ctx.createGain();
    nGain.gain.value = preset.noise;
    noise.connect(nFilter).connect(nGain).connect(out);

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);
    noise.start(now);

    return {
      stop: () => {
        const t = ctx.currentTime;
        try {
          out.gain.cancelScheduledValues(t);
          out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), t);
          out.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
          const stopAt = t + 0.55;
          osc1.stop(stopAt);
          osc2.stop(stopAt);
          lfo.stop(stopAt);
          noise.stop(stopAt);
        } catch { /* ignore stopped node */ }
      },
    };
  }

  async sync({ trackId = null, playing = false, volume = 0.35 } = {}) {
    this.volume = Math.max(0, Math.min(1, Number(volume) || 0));
    const preset = findSoundscape(trackId);
    if (!playing || !preset) {
      this.stop();
      this.trackId = trackId;
      return;
    }
    const ctx = this._ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch { return; }
    }
    if (this.active && this.trackId !== preset.id) {
      this.active.stop();
      this.active = null;
    }
    if (!this.active) {
      this.active = this._buildLayer(preset);
    }
    this.trackId = preset.id;
    this.playing = true;
    this.master.gain.setTargetAtTime(this.volume, ctx.currentTime, 0.15);
  }

  stop() {
    this.playing = false;
    if (this.active) {
      this.active.stop();
      this.active = null;
    }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    }
  }
}

export const soundscapeEngine = new SoundscapeEngine();

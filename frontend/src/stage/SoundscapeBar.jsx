import { useEffect, useState } from 'react';
import { SOUNDSCAPES, soundscapeEngine } from './soundscape-engine.js';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

export default function SoundscapeBar({ lang = 'pt', initial = null, onStageAudio = null, compact = false }) {
  const [trackId, setTrackId] = useState(initial?.trackId || 'tavern');
  const [playing, setPlaying] = useState(!!initial?.playing);
  const [volume, setVolume] = useState(initial?.volume ?? 0.35);
  const initTrack = initial?.trackId;
  const initPlay = initial?.playing;
  const initVol = initial?.volume;

  useEffect(() => {
    if (initTrack) setTrackId(initTrack);
    if (typeof initPlay === 'boolean') setPlaying(initPlay);
    if (typeof initVol === 'number') setVolume(initVol);
  }, [initTrack, initPlay, initVol]);

  useEffect(() => {
    soundscapeEngine.sync({ trackId, playing, volume });
  }, [trackId, playing, volume]);

  const commit = (patch) => {
    const next = { trackId, playing, volume, ...patch };
    if ('trackId' in patch) setTrackId(patch.trackId);
    if ('playing' in patch) setPlaying(patch.playing);
    if ('volume' in patch) setVolume(patch.volume);
    onStageAudio?.(next);
  };

  return (
    <section className={`mesa-soundscape${compact ? ' is-compact' : ''}`} aria-label={L(lang, 'Trilha ambiente', 'Ambient soundscape')}>
      <div className="mesa-soundscape-head">
        <p className="mesa-eyebrow">{L(lang, 'Trilha ambiente', 'Ambient soundscape')}</p>
        <button
          type="button"
          className={`mesa-btn mesa-btn-sm${playing ? ' is-primary' : ''}`}
          aria-pressed={playing}
          onClick={() => commit({ playing: !playing })}
        >
          {playing ? `⏸ ${L(lang, 'Pausar', 'Pause')}` : `▶ ${L(lang, 'Tocar', 'Play')}`}
        </button>
      </div>
      <fieldset className="mesa-soundscape-presets" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="sr-only">{L(lang, 'Ambientes', 'Environments')}</legend>
        {SOUNDSCAPES.map(sc => (
          <button
            key={sc.id}
            type="button"
            className={`mesa-sound-pill${trackId === sc.id ? ' active' : ''}`}
            aria-pressed={trackId === sc.id}
            onClick={() => commit({ trackId: sc.id, playing: trackId === sc.id ? !playing : true })}
          >
            <span aria-hidden="true">{sc.icon}</span> {lang === 'en' ? sc.en : sc.pt}
          </button>
        ))}
      </fieldset>
      <label className="mesa-soundscape-vol">
        <span className="mesa-hint">{L(lang, 'Volume', 'Volume')}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          aria-label={L(lang, 'Volume da trilha', 'Soundscape volume')}
          onChange={e => commit({ volume: parseFloat(e.target.value) })}
        />
      </label>
    </section>
  );
}

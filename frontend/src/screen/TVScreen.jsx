import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { connectSocket } from '../api/socket.js';

const t = (lang, pt, en) => lang === 'pt' ? pt : en;
const CONDITION_LABELS = {
  blinded: { pt: 'Cego', en: 'Blinded' },
  charmed: { pt: 'Encantado', en: 'Charmed' },
  deafened: { pt: 'Surdo', en: 'Deafened' },
  frightened: { pt: 'Amedrontado', en: 'Frightened' },
  grappled: { pt: 'Agarrado', en: 'Grappled' },
  incapacitated: { pt: 'Incapacitado', en: 'Incapacitated' },
  invisible: { pt: 'Invisível', en: 'Invisible' },
  paralyzed: { pt: 'Paralisado', en: 'Paralyzed' },
  petrified: { pt: 'Petrificado', en: 'Petrified' },
  poisoned: { pt: 'Envenenado', en: 'Poisoned' },
  prone: { pt: 'Caído', en: 'Prone' },
  restrained: { pt: 'Imobilizado', en: 'Restrained' },
  stunned: { pt: 'Atordoado', en: 'Stunned' },
  unconscious: { pt: 'Inconsciente', en: 'Unconscious' },
  exhaustion: { pt: 'Exausto', en: 'Exhausted' },
};

export default function TVScreen({ token, lang = 'pt' }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await api.screen(token);
      setData(res.campaign);
      setError('');
    } catch (e) {
      setError(e?.message || 'Falha ao carregar telão');
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Socket primário + fallback polling 3s
  useEffect(() => {
    let socket = null;
    let cancelled = false;
    let pollId = null;
    (async () => {
      try {
        socket = await connectSocket({ screenToken: token });
        socket.on('character:update', load);
        socket.on('campaign:state', load);
        socket.on('campaign:member', load);
        socket.on('approval:reviewed', load);
        socket.on('dice:public', () => setTick(x => x + 1));
      } catch (e) {
        // fallback
        pollId = setInterval(() => { if (!cancelled) load(); }, 3000);
      }
    })();
    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
      socket?.disconnect();
    };
  }, [token, load]);

  if (error) return <div className="tv-error"><h1>{error}</h1></div>;
  if (!data) return <div className="tv-loading"><h1>{t(lang, 'Carregando…', 'Loading…')}</h1></div>;

  const members = (data.members || []).filter(m => m.character);
  const playerMembers = members.filter(m => m.role !== 'dm');

  return (
    <div className="tv-screen">
      <header className="tv-header">
        <div>
          <h1 className="tv-title">{data.name}</h1>
          {data.state?.scene && <h2 className="tv-scene">{data.state.scene}</h2>}
        </div>
        <div className="tv-meta">
          {data.state?.session && <div>{t(lang, 'Sessão', 'Session')} {data.state.session}</div>}
          {data.state?.weather && <div>{data.state.weather}</div>}
          <div className="tv-clock">{new Date().toLocaleTimeString()}</div>
        </div>
      </header>

      <main className="tv-grid">
        {playerMembers.map(m => <CharCard key={m.id} member={m} lang={lang} />)}
      </main>

      {data.state?.initiative && (
        <aside className="tv-initiative">
          <h3>{t(lang, 'Iniciativa', 'Initiative')}</h3>
          <ol>
            {(data.state.initiative || []).map((entry, idx) => (
              <li key={idx} className={idx === data.state.initiativeTurn ? 'current' : ''}>
                {entry.name} ({entry.value})
              </li>
            ))}
          </ol>
        </aside>
      )}
    </div>
  );
}

function CharCard({ member, lang }) {
  const c = member.character;
  const hpPct = c.maxHp ? Math.max(0, Math.min(100, (c.currentHp / c.maxHp) * 100)) : 0;
  const hpColor = hpPct > 60 ? '#5cba5c' : hpPct > 30 ? '#d4a84d' : '#d44d4d';
  return (
    <article className="tv-char-card">
      <div className="tv-char-head">
        {c.avatar ? <img src={c.avatar} alt="" className="tv-avatar" /> : <div className="tv-avatar tv-avatar-placeholder">{(c.name || '?').slice(0, 1)}</div>}
        <div>
          <div className="tv-char-name">{c.name}</div>
          <div className="tv-char-sub">{member.user.displayName} · {c.race} {c.className} {c.level}</div>
        </div>
        {c.inspiration && <div className="tv-inspiration" title="Inspiration">★</div>}
      </div>
      <div className="tv-hp-bar">
        <div className="tv-hp-fill" style={{ width: `${hpPct}%`, background: hpColor }} />
        <div className="tv-hp-text">{c.currentHp ?? '?'} / {c.maxHp ?? '?'} HP{c.tempHp ? ` (+${c.tempHp})` : ''}</div>
      </div>
      <div className="tv-stats">
        <div><span className="lbl">CA</span> <span className="val">{c.armorClass ?? '—'}</span></div>
        <div><span className="lbl">{t(lang, 'Vel', 'Spd')}</span> <span className="val">{c.speed ?? 30}</span></div>
        {c.deathSaves && (c.deathSaves.success + c.deathSaves.fail > 0) && (
          <div className="tv-death">
            <span className="lbl">{t(lang, 'Morte', 'Death')}</span>
            <span className="val">✓{c.deathSaves.success} ✗{c.deathSaves.fail}</span>
          </div>
        )}
      </div>
      {c.conditions?.length > 0 && (
        <div className="tv-conditions">
          {c.conditions.map(cond => (
            <span key={cond} className="tv-condition">{CONDITION_LABELS[cond]?.[lang] || cond}</span>
          ))}
        </div>
      )}
    </article>
  );
}

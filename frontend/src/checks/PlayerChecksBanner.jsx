// Pedidos de teste do mestre mostrados na ficha do jogador (em campanha).
// Não bloqueia nada: "Depois" recolhe para um lembrete pequeno.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import CheckRequestCard from './CheckRequestCard.jsx';
import './checks-styles.css';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);

export default function PlayerChecksBanner({ char, lang = 'pt' }) {
  const [checks, setChecks] = useState([]);
  const [hidden, setHidden] = useState(() => new Set());
  const seenRef = useRef(new Set());
  const stopRef = useRef(false);

  const load = useCallback(async () => {
    if (stopRef.current) return;
    try {
      const r = await api.myChecks();
      const list = (r.checks || []).filter(c => c.characterId == null || c.characterId === char.id);
      // Vibra uma vez por pedido novo (sem som, sem modal).
      const fresh = list.filter(c => !c.myResponse && !seenRef.current.has(c.id));
      if (fresh.length && seenRef.current.size && navigator.vibrate) navigator.vibrate([40, 60, 40]);
      list.forEach(c => seenRef.current.add(c.id));
      setChecks(list);
    } catch (e) {
      if (e?.status === 401 || e?.status === 403) stopRef.current = true;
    }
  }, [char.id]);

  useEffect(() => { stopRef.current = false; }, [char.id]);
  usePolling(load, 4000, [char.id]);

  const onAnswered = (updated) => {
    setChecks(prev => prev.map(c => (c.id === updated.id ? { ...c, ...updated } : c)));
  };

  if (!checks.length) return null;
  const visible = checks.filter(c => !hidden.has(c.id));
  const collapsed = checks.filter(c => hidden.has(c.id) && !c.myResponse);

  return (
    <section className="player-checks no-print" aria-label={L(lang, 'Pedidos do mestre', 'DM requests')}>
      {visible.map(c => (
        <CheckRequestCard
          key={c.id}
          check={c}
          char={char}
          lang={lang}
          onAnswered={onAnswered}
          onDismiss={() => setHidden(prev => new Set(prev).add(c.id))}
        />
      ))}
      {collapsed.length > 0 && (
        <button type="button" className="player-checks-pill" onClick={() => setHidden(new Set())}>
          🎯 {collapsed.length === 1
            ? L(lang, `Teste pendente: ${collapsed[0].label}`, `Pending check: ${collapsed[0].label}`)
            : L(lang, `${collapsed.length} testes pendentes`, `${collapsed.length} pending checks`)}
        </button>
      )}
    </section>
  );
}

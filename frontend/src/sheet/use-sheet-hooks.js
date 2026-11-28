import { useEffect, useRef } from 'react';

export function useSheetScrollMemory(charId, tab) {
  const mapRef = useRef(new Map());
  const prevRef = useRef({ charId, tab });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prev = prevRef.current;
    if (prev.charId === charId && prev.tab !== tab) {
      mapRef.current.set(`${charId}:${prev.tab}`, window.scrollY || 0);
      const saved = mapRef.current.get(`${charId}:${tab}`);
      if (saved != null) {
        requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: 'auto' }));
      }
    }
    prevRef.current = { charId, tab };
  }, [charId, tab]);
}

export function useSheetKeyAndObserver({ charId, rootRef, charRef, undoRef, onUpdate, sheetToastApi, pt, setStickyHero }) {
  useEffect(() => {
    const heroEl = rootRef.current?.querySelector('.fh-hero');
    if (!heroEl || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => {
      setStickyHero(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    }, { threshold: 0 });
    io.observe(heroEl);
    return () => io.disconnect();
  }, [charId, rootRef, setStickyHero]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) return;
      if (e.shiftKey) {
        const res = undoRef.current?.redo(charRef.current);
        if (res) {
          e.preventDefault();
          onUpdate(res.state);
          sheetToastApi.show({ tone: 'info', ms: 3000, text: pt ? 'Alteração refeita' : 'Change redone' });
        }
        return;
      }
      const res = undoRef.current?.undo(charRef.current);
      if (res) {
        e.preventDefault();
        onUpdate(res.state);
        sheetToastApi.show({ tone: 'info', ms: 3000, text: pt ? 'Alteração desfeita' : 'Change undone' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [charRef, undoRef, onUpdate, pt, sheetToastApi]);
}

export function useSheetHpHandlers({ char, charRef, lang, pt, update, onUpdate, undoRef, sheetToastApi, setConcPrompt }) {
  const maybeTriggerConc = (dmgLost, newHp) => {
    const activeSpell = char.concentratingSpell || char.concentration;
    if (!activeSpell || dmgLost <= 0) return;
    if (newHp <= 0) {
      setConcPrompt({ spell: activeSpell, dc: 0, dropped: true });
      return;
    }
    setConcPrompt({ spell: activeSpell, dc: Math.max(10, Math.floor(dmgLost / 2)), dropped: false });
  };

  const applyHpRaw = (delta) => {
    const ws = char.wildShape;
    if (ws?.active && char.rulesVersion !== '2024' && delta < 0) {
      const dmg = -delta;
      const beastHp = ws.beastCurrentHp || 0;
      if (dmg <= beastHp) {
        update({ currentHp: beastHp - dmg, wildShape: { ...ws, beastCurrentHp: beastHp - dmg } }, 'hp');
      } else {
        const newHumanoidHp = Math.max(0, (ws.preTransformHp || 0) - (dmg - beastHp));
        update({ currentHp: newHumanoidHp, tempHp: ws.preTransformTempHp || 0, wildShape: { active: false } }, 'hp');
      }
      return;
    }
    if (ws?.active && char.rulesVersion !== '2024' && delta > 0) {
      const newBeast = Math.min(ws.beastMaxHp || 0, (ws.beastCurrentHp || 0) + delta);
      update({ currentHp: newBeast, wildShape: { ...ws, beastCurrentHp: newBeast } }, 'hp');
      return;
    }
    let newCurrent = char.currentHp + delta;
    let newTemp = char.tempHp || 0;
    let hpLost = 0;
    if (delta < 0) {
      const dmg = -delta;
      const absorbed = Math.min(newTemp, dmg);
      newTemp -= absorbed;
      hpLost = Math.min(char.currentHp || 0, dmg - absorbed);
      newCurrent = char.currentHp - (dmg - absorbed);
    } else {
      newCurrent = Math.min(char.maxHp, char.currentHp + delta);
    }
    newCurrent = Math.max(0, Math.min(newCurrent, char.maxHp));
    update({ currentHp: newCurrent, tempHp: newTemp }, 'hp');
    if (hpLost > 0) maybeTriggerConc(hpLost, newCurrent);
  };

  const hpSnapshot = () => ({
    currentHp: char.currentHp, tempHp: char.tempHp || 0, wildShape: char.wildShape,
    deathSaves: char.deathSaves, stabilized: char.stabilized ?? null,
  });

  const applyHp = (delta) => {
    if (!delta) return;
    const before = hpSnapshot();
    applyHpRaw(delta);
    const n = Math.abs(delta);
    const undo = () => {
      const res = undoRef.current?.undo(charRef.current);
      onUpdate(res ? res.state : { ...charRef.current, ...before });
    };
    const ptL = lang === 'pt';
    const beast = !!char.wildShape?.active && char.rulesVersion !== '2024';
    if (beast) {
      sheetToastApi.show({
        tone: delta < 0 ? 'hurt' : 'heal',
        actionLabel: ptL ? 'Desfazer (Ctrl+Z)' : 'Undo (Ctrl+Z)',
        text: delta < 0 ? (ptL ? `Dano: −${n} PV` : `Damage: −${n} HP`) : (ptL ? `Cura: +${n} PV` : `Healing: +${n} HP`),
        onAction: undo,
      });
      return;
    }
    const cur = char.currentHp || 0;
    const temp = char.tempHp || 0;
    if (delta > 0) {
      const healed = Math.max(0, Math.min((char.maxHp || 0) - cur, delta));
      sheetToastApi.show(healed > 0
        ? { tone: 'heal', actionLabel: ptL ? 'Desfazer (Ctrl+Z)' : 'Undo (Ctrl+Z)', text: ptL ? `Cura: +${healed} PV` : `Healing: +${healed} HP`, onAction: undo }
        : { tone: 'info', ms: 3500, text: ptL ? 'Cura: +0 PV (os PV já estão no máximo)' : 'Healing: +0 HP (already at maximum)' });
      return;
    }
    const absorbed = Math.min(temp, n);
    const lost = Math.min(cur, n - absorbed);
    if (!absorbed && !lost) {
      sheetToastApi.show({ tone: 'info', ms: 3500, text: ptL ? 'Dano: −0 PV (já estava com 0 PV)' : 'Damage: −0 HP (already at 0 HP)' });
      return;
    }
    const parts = [];
    if (lost) parts.push(ptL ? `−${lost} PV` : `−${lost} HP`);
    if (absorbed) parts.push(ptL ? `−${absorbed} PV temporários` : `−${absorbed} temporary HP`);
    const fell = lost > 0 && cur - lost === 0;
    sheetToastApi.show({
      tone: 'hurt',
      actionLabel: ptL ? 'Desfazer (Ctrl+Z)' : 'Undo (Ctrl+Z)',
      text: `${ptL ? 'Dano' : 'Damage'}: ${parts.join(ptL ? ' e ' : ' and ')}${fell ? (ptL ? ' · caiu a 0 PV' : ' · down to 0 HP') : ''}`,
      onAction: undo,
    });
  };

  const setTempHp = (n) => {
    const before = hpSnapshot();
    update({ tempHp: Math.max(0, n) }, 'tempHp');
    sheetToastApi.show({
      tone: 'temp',
      actionLabel: pt ? 'Desfazer (Ctrl+Z)' : 'Undo (Ctrl+Z)',
      text: pt ? `PV temporários: ${n}` : `Temporary HP: ${n}`,
      onAction: () => onUpdate({ ...charRef.current, ...before }),
    });
  };

  return { applyHp, setTempHp };
}

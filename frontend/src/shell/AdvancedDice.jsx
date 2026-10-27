// Ferramenta avançada "Dados preparados pelo mestre" (antiga aba Dados).
// Opt-in: só aparece em ⚙ Ajustes › Ferramentas avançadas (e no Mais › 🎲) quando ligada.
//
// Um cartão por jogador com tudo dentro (plano F8): nome e personagem, "N na fila",
// o campo Dado + Valores com ➕ Adicionar à fila (o alvo é o próprio cartão: acabou
// o vai e vem até o topo), ⚡ Próximo resultado, a fila em linhas com ↑ ↓ × de 44 px
// ("usado" marcado) e Limpar tudo (com confirmação). Os campos vêm antes da fila:
// o que entra nela cresce para baixo e nada mexe debaixo do dedo. O histórico (50
// últimas) fica recolhido embaixo. Sem caixa rolável própria: rola o corpo da folha.
// As contas ficam em prepared-dice.js (testadas em tests/prepared-dice.test.js).
import { useCallback, useEffect, useId, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { confirmDialog } from '../../components/ConfirmDialog.jsx';
import {
  DICE_TYPES, canMoveDown, canMoveUp, diceLabel, historyRows, moveValue, parseValues, pendingCount,
  playersOf, queueSummary, removeValueAt, rigsByUser, valuesError,
} from './prepared-dice.js';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);

export default function AdvancedDice({ campaign, lang }) {
  const [rigs, setRigs] = useState(null);   // null = carregando
  const [log, setLog] = useState([]);
  const [loadErr, setLoadErr] = useState('');
  const load = useCallback(async () => {
    try {
      const [r, l] = await Promise.all([api.listRigs(campaign.id), api.diceLog(campaign.id).catch(() => null)]);
      setRigs(r.rigs || []);
      if (l) setLog(l.log || []);
      setLoadErr('');
    } catch (e) {
      setRigs(prev => prev || []);
      setLoadErr(errorMessage(e, lang));
    }
  }, [campaign.id, lang]);
  useEffect(() => { load(); }, [load]);

  const players = playersOf(campaign.members);
  const byUser = rigsByUser(rigs || []);
  const rows = historyRows(log, campaign.members);

  return (
    <div className="adv-dice col gap-3">
      <p className="adv-intro">
        {t(lang,
          'Defina os próximos valores que cada jogador "rolará". Quando ele rolar pelo app, esses valores saem na ordem da fila. Os jogadores não veem isto.',
          'Set the next values each player will "roll". When they roll in the app, these values come out in queue order. Players cannot see this.')}
      </p>
      {loadErr && (
        <p className="adv-msg is-err" role="alert">
          {loadErr} <button type="button" className="mesa-btn is-quiet" onClick={load}>{t(lang, 'Tentar de novo', 'Try again')}</button>
        </p>
      )}
      {rigs == null && <p className="muted">{t(lang, 'Carregando…', 'Loading…')}</p>}
      {rigs != null && players.length === 0 && (
        <p className="muted">{t(lang, 'Ainda não há jogadores na mesa. Convide em Grupo › Jogadores.', 'No players at the table yet. Invite them under Party › Players.')}</p>
      )}
      {rigs != null && players.map(p => (
        <PlayerDiceCard key={p.id ?? p.user.id} member={p} rigs={byUser[p.user.id] || []} campaignId={campaign.id} lang={lang} onChange={load} />
      ))}
      <details className="adv-history mesa-panel is-sunk">
        <summary>
          <span>{t(lang, 'Histórico de rolagens', 'Roll history')}</span>
          <span className="adv-history-n">{rows.length}</span>
        </summary>
        {rows.length === 0 ? (
          <p className="muted adv-history-empty">{t(lang, 'Nenhuma rolagem ainda. As rolagens feitas na ficha dentro da campanha aparecem aqui.', 'No rolls yet. Rolls made from sheets in this campaign show up here.')}</p>
        ) : (
          <ol className="adv-log">
            {rows.map(r => (
              <li key={r.id} className={`adv-log-row ${r.rigged ? 'is-rigged' : ''}`}>
                <span className="adv-log-result">{r.result}</span>
                <span className="adv-log-main">
                  <span className="adv-log-who">{r.who}{r.label && <span className="adv-log-label"> · {r.label}</span>}</span>
                  <span className="adv-log-meta">
                    <span className="adv-log-die">{r.dice}</span>
                    {r.rigged && <span className="adv-log-flag">★ {t(lang, 'da fila', 'from queue')}</span>}
                    <time className="adv-log-time" dateTime={r.at}>{timeOf(r.at, lang)}</time>
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </details>
    </div>
  );
}

function timeOf(iso, lang) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try { return d.toLocaleTimeString(lang === 'en' ? 'en-US' : 'pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}

/** Um jogador: a fila dele, o campo para enfileirar, o próximo resultado e Limpar tudo. */
function PlayerDiceCard({ member, rigs, campaignId, lang, onChange }) {
  const uid = member.user.id;
  const baseId = useId();
  const [die, setDie] = useState('d20');
  const [text, setText] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);   // {text, err} — o que veio do servidor (rodapé do cartão)
  const [addErr, setAddErr] = useState('');   // motivo escrito embaixo de cada campo (nada vai ao servidor)
  const [nextErr, setNextErr] = useState('');
  const n = pendingCount(rigs);
  const name = member.user.displayName;

  // Toda escrita passa por aqui: botão desligado enquanto envia e o erro escrito no cartão.
  const send = async (fn, ok = '') => {
    if (busy) return false;
    setBusy(true); setMsg(null);
    try {
      await fn();
      if (ok) setMsg({ text: ok, err: false });
      await onChange();
      return true;
    } catch (e) {
      setMsg({ text: `${t(lang, 'Não enviado', 'Not sent')} · ${errorMessage(e, lang)}`, err: true });
      return false;
    } finally { setBusy(false); }
  };

  // Os botões só se apagam enquanto enviam ("…"): com o campo vazio ou errado, o toque
  // escreve o motivo embaixo do campo.
  const parsed = parseValues(text, die);
  const textErr = addErr || (text.trim() ? valuesError(parsed, die, lang) : '');
  const enqueue = async (e) => {
    e.preventDefault();
    const err = valuesError(parsed, die, lang);
    if (err) { setAddErr(err); return; }
    const k = parsed.values.length;
    if (await send(() => api.createRig(campaignId, { targetUserId: uid, diceType: die, values: parsed.values }),
      t(lang, `${k === 1 ? 'Valor adicionado' : `${k} valores adicionados`} à fila ✓`, `${k === 1 ? 'Value' : `${k} values`} added to the queue ✓`))) setText('');
  };
  const nextParsed = parseValues(next, 'any');
  const inject = async (e) => {
    e.preventDefault();
    if (nextParsed.values.length !== 1 || nextParsed.bad.length) {
      setNextErr(t(lang, 'Digite um número de 1 a 100.', 'Type a number from 1 to 100.'));
      return;
    }
    if (await send(() => api.createRig(campaignId, { targetUserId: uid, diceType: 'any', values: nextParsed.values }),
      t(lang, 'Próximo resultado definido ✓', 'Next result set ✓'))) setNext('');
  };
  const move = (rig, i, to) => {
    const v = moveValue(rig.values, i, to);
    if (v) send(() => api.updateRig(rig.id, { values: v }));
  };
  const remove = (rig, i) => {
    const { values, empty } = removeValueAt(rig.values, i);
    send(() => (empty ? api.deleteRig(rig.id) : api.updateRig(rig.id, { values })));
  };
  const clearAll = async () => {
    const ok = await confirmDialog({
      title: t(lang, `Limpar a fila de ${name}?`, `Clear ${name}'s queue?`),
      message: t(lang, 'As próximas rolagens deste jogador voltam a sair ao acaso.', "This player's next rolls go back to being random."),
      confirmLabel: t(lang, 'Limpar tudo', 'Clear all'),
      danger: true,
      lang,
    });
    if (!ok) return;
    send(() => Promise.all(rigs.map(r => api.deleteRig(r.id))), t(lang, 'Fila limpa ✓', 'Queue cleared ✓'));
  };

  return (
    <section className="adv-card mesa-panel is-sunk" aria-labelledby={`${baseId}-n`}>
      <header className="adv-card-head">
        <div className="adv-card-who">
          <strong id={`${baseId}-n`}>{name}</strong>
          <span className="adv-card-char">{member.character?.name || t(lang, 'sem personagem', 'no character')}</span>
        </div>
        <span className={`adv-card-count ${n ? 'has-queue' : ''}`}>{queueSummary(n, lang)}</span>
      </header>

      <form className="adv-add" onSubmit={enqueue}>
        <div className="mesa-field adv-add-die">
          <label htmlFor={`${baseId}-die`}>{t(lang, 'Dado', 'Die')}</label>
          <select id={`${baseId}-die`} value={die} onChange={(e) => { setDie(e.target.value); setAddErr(''); }}>
            {DICE_TYPES.map(d => <option key={d} value={d}>{d === 'any' ? t(lang, 'Qualquer', 'Any') : d}</option>)}
          </select>
        </div>
        <div className="mesa-field adv-add-vals">
          <label htmlFor={`${baseId}-vals`}>{t(lang, 'Valores', 'Values')}</label>
          <input id={`${baseId}-vals`} value={text} inputMode="decimal" autoComplete="off" enterKeyHint="done"
            placeholder="15, 12, 18" aria-invalid={!!textErr} aria-describedby={`${baseId}-vals-h`}
            onChange={(e) => { setText(e.target.value); setAddErr(''); setMsg(null); }} />
        </div>
        <button type="submit" className="mesa-btn is-primary adv-add-btn" disabled={busy}>
          {busy ? '…' : <>➕ {t(lang, 'Adicionar à fila', 'Add to queue')}</>}
        </button>
        <p id={`${baseId}-vals-h`} className={`adv-hint ${textErr ? 'is-err' : ''}`}>
          {textErr || (text.trim()
            ? t(lang, `Entram na fila de ${name}, nesta ordem.`, `They go into ${name}'s queue, in this order.`)
            : t(lang, 'Separe com vírgula. Enter também adiciona.', 'Separate with commas. Enter also adds.'))}
        </p>
      </form>

      <form className="adv-next" onSubmit={inject}>
        <div className="mesa-field adv-next-field">
          <label htmlFor={`${baseId}-next`}>{t(lang, 'Próximo resultado', 'Next result')}</label>
          <input id={`${baseId}-next`} type="number" inputMode="numeric" min={1} max={100} value={next}
            placeholder={t(lang, 'qualquer dado, 1–100', 'any die, 1–100')} aria-invalid={!!nextErr} aria-describedby={`${baseId}-next-h`}
            onChange={(e) => { setNext(e.target.value); setNextErr(''); setMsg(null); }} />
        </div>
        <button type="submit" className="mesa-btn adv-next-btn" disabled={busy}>{busy ? '…' : <>⚡ {t(lang, 'Definir', 'Set')}</>}</button>
        <p id={`${baseId}-next-h`} className={`adv-hint ${nextErr ? 'is-err' : ''}`}>
          {nextErr || t(lang, 'Vale para qualquer dado e entra no fim da fila.', 'Works for any die and goes to the end of the queue.')}
        </p>
      </form>

      {rigs.length === 0 ? (
        <p className="adv-empty">{t(lang, 'Sem rolagens na fila: as deste jogador saem ao acaso.', "Nothing queued: this player's rolls are random.")}</p>
      ) : (
        <ol className="adv-queue" aria-label={t(lang, `Fila de ${name}`, `${name}'s queue`)}>
          {rigs.flatMap(rig => (rig.values || []).map((v, i) => (
            <li key={`${rig.id}-${i}`} className={`adv-q ${v.consumed ? 'is-used' : ''}`}>
              <span className="adv-q-num">{v.value}</span>
              <span className="adv-q-die">{diceLabel(rig.diceType, lang)}{v.label ? ` · ${v.label}` : ''}</span>
              {v.consumed ? (
                <span className="adv-q-used">{t(lang, 'usado', 'used')}</span>
              ) : (
                <span className="adv-q-act">
                  <button type="button" className="mesa-icon-btn adv-q-btn" disabled={busy || !canMoveUp(rig.values, i)} onClick={() => move(rig, i, i - 1)}
                    aria-label={t(lang, `Mover ${v.value} para cima`, `Move ${v.value} up`)}>↑</button>
                  <button type="button" className="mesa-icon-btn adv-q-btn" disabled={busy || !canMoveDown(rig.values, i)} onClick={() => move(rig, i, i + 1)}
                    aria-label={t(lang, `Mover ${v.value} para baixo`, `Move ${v.value} down`)}>↓</button>
                  <button type="button" className="mesa-icon-btn adv-q-btn is-x" disabled={busy} onClick={() => remove(rig, i)}
                    aria-label={t(lang, `Tirar ${v.value} da fila`, `Remove ${v.value} from the queue`)}>×</button>
                </span>
              )}
            </li>
          )))}
        </ol>
      )}

      {(rigs.length > 0 || msg) && (
        <div className="adv-card-foot">
          {msg && <p className={`adv-msg ${msg.err ? 'is-err' : ''}`} role={msg.err ? 'alert' : 'status'}>{msg.text}</p>}
          {rigs.length > 0 && (
            <button type="button" className="mesa-btn is-quiet adv-clear" disabled={busy} onClick={clearAll}>{t(lang, 'Limpar tudo', 'Clear all')}</button>
          )}
        </div>
      )}
    </section>
  );
}

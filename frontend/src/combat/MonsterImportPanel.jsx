import { useEffect, useId, useState } from 'react';
import { importMonsters } from '../campaigns/import-5emm.js';
import { estimateCr } from './cr-estimate.js';
import './monster-tools.css';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Importar monstro de JSON: arquivo .5emm.json (5e Monster Maker) ou criatura
 * do Open5e (v1/v2). Mostra o resultado antes de salvar na lista local.
 */
export default function MonsterImportPanel({ lang, onSave, onCancel, onDirty }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const ids = useId();
  // algo colado ou convertido e ainda não salvo: a folha pergunta antes de fechar
  const dirty = !!text.trim() || !!result?.monsters?.length;
  useEffect(() => { onDirty?.(dirty); }, [dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (input) => setResult(importMonsters(input, { lang }));

  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setResult({ monsters: [], errors: [t(lang, 'Arquivo grande demais (máx. 2 MB).', 'File too large (max 2 MB).')], warnings: [] });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { const s = String(reader.result || ''); setText(s.length < 200000 ? s : ''); run(s); };
    reader.onerror = () => setResult({ monsters: [], errors: [t(lang, 'Não consegui ler o arquivo.', 'Could not read the file.')], warnings: [] });
    reader.readAsText(file);
  };

  return (
    <div className="mi-panel">
      <p className="mi-intro">
        {t(lang,
          'Aceita arquivos .5emm.json do 5e Monster Maker e criaturas do Open5e (v1 /monsters ou v2 /creatures). Os monstros ficam só neste navegador.',
          'Accepts .5emm.json files from 5e Monster Maker and Open5e creatures (v1 /monsters or v2 /creatures). Monsters stay in this browser only.')}
      </p>
      <label className="mesa-btn mi-file">
        📂 {t(lang, 'Escolher arquivo…', 'Choose file…')}
        <input type="file" accept=".json,application/json" onChange={onFile} className="mi-file-input" />
      </label>
      <div className="mi-paste">
        <label className="mp-num-label" htmlFor={`${ids}-json`}>{t(lang, '…ou cole o JSON aqui', '…or paste the JSON here')}</label>
        <textarea id={`${ids}-json`} value={text} onChange={e => setText(e.target.value)} spellCheck={false} placeholder='{ "saveVersion": 11, "name": "…" }' />
      </div>
      <div className="mi-convert">
        <button type="button" className="mesa-btn" disabled={!text.trim()} onClick={() => run(text)}>
          {t(lang, 'Converter', 'Convert')}
        </button>
      </div>

      {result?.errors?.map((e, i) => <div key={`e${i}`} className="mi-msg err" role="alert">{e}</div>)}
      {result?.warnings?.map((w, i) => <div key={`w${i}`} className="mi-msg warn">{w}</div>)}
      {result?.monsters?.map(m => {
        const est = estimateCr(m);
        return (
          <div key={m.id} className="mi-result">
            <div>
              <strong>{m.name.en}</strong>
              <div className="mi-result-sub">
                {m.size} {m.type} · {t(lang, 'CA', 'AC')} {m.ac} · {t(lang, 'PV', 'HP')} {m.hp} · {t(lang, 'ações', 'actions')} {m.actions.length}
              </div>
            </div>
            <div className="mi-result-cr">
              {t(lang, 'ND', 'CR')} {m.cr}<br />{t(lang, 'estimado', 'estimated')} {est.cr}
            </div>
          </div>
        );
      })}

      <div className="mp-footer is-pinned">
        <span className="mp-spacer" />
        <button type="button" className="mesa-btn mesa-btn-lg" onClick={onCancel}>{t(lang, 'Voltar', 'Back')}</button>
        <button type="button" className="mesa-btn mesa-btn-lg is-primary" disabled={!result?.monsters?.length} onClick={() => onSave(result.monsters)}>
          {t(lang, 'Salvar na minha lista', 'Save to my list')}{result?.monsters?.length > 1 ? ` (${result.monsters.length})` : ''}
        </button>
      </div>
    </div>
  );
}

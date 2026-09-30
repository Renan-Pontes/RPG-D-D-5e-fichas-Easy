import { useState } from 'react';
import { importMonsters } from '../campaigns/import-5emm.js';
import { estimateCr } from './cr-estimate.js';
import './monster-tools.css';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Importar monstro de JSON: arquivo .5emm.json (5e Monster Maker) ou criatura
 * do Open5e (v1/v2). Mostra o resultado antes de salvar na lista local.
 */
export default function MonsterImportPanel({ lang, onSave, onCancel }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);

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
      <p className="muted small" style={{ margin: 0 }}>
        {t(lang,
          'Aceita arquivos .5emm.json do 5e Monster Maker e criaturas do Open5e (v1 /monsters ou v2 /creatures). Os monstros ficam só neste navegador.',
          'Accepts .5emm.json files from 5e Monster Maker and Open5e creatures (v1 /monsters or v2 /creatures). Monsters stay in this browser only.')}
      </p>
      <label className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', margin: 0 }}>
        📂 {t(lang, 'Escolher arquivo…', 'Choose file…')}
        <input type="file" accept=".json,application/json" onChange={onFile} style={{ display: 'none' }} />
      </label>
      <label style={{ margin: 0 }}>
        <span className="muted small">{t(lang, '…ou cole o JSON aqui', '…or paste the JSON here')}</span>
        <textarea value={text} onChange={e => setText(e.target.value)} spellCheck={false} placeholder='{ "saveVersion": 11, "name": "…" }' />
      </label>
      <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-ghost btn-sm" disabled={!text.trim()} onClick={() => run(text)}>
          {t(lang, 'Converter', 'Convert')}
        </button>
      </div>

      {result?.errors?.map((e, i) => <div key={`e${i}`} className="mi-msg err">{e}</div>)}
      {result?.warnings?.map((w, i) => <div key={`w${i}`} className="mi-msg warn">{w}</div>)}
      {result?.monsters?.map(m => {
        const est = estimateCr(m);
        return (
          <div key={m.id} className="mi-result">
            <div>
              <strong>{m.name.en}</strong>
              <div className="muted small">
                {m.size} {m.type} · CA {m.ac} · PV {m.hp} · {t(lang, 'ações', 'actions')} {m.actions.length}
              </div>
            </div>
            <div className="muted small" style={{ textAlign: 'right' }}>
              ND {m.cr}<br />{t(lang, 'estimado', 'estimated')} {est.cr}
            </div>
          </div>
        );
      })}

      <div className="mp-footer">
        <span className="mp-spacer" />
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>{t(lang, 'Voltar', 'Back')}</button>
        <button type="button" className="btn btn-primary btn-sm" disabled={!result?.monsters?.length} onClick={() => onSave(result.monsters)}>
          {t(lang, 'Salvar na minha lista', 'Save to my list')}{result?.monsters?.length > 1 ? ` (${result.monsters.length})` : ''}
        </button>
      </div>
    </div>
  );
}

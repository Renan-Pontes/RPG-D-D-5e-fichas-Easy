/* Home screen — list of characters */
import { useRef, useState, useMemo } from 'react';
import Icon from './Icons.jsx';
import { Filigree } from './Shared.jsx';
import { t, tName } from '../data/i18n.js';

const CharacterList = ({ lang, characters, onOpen, onNew, onImport, onExportAll }) => {
  const fileRef = useRef(null);
  const [query, setQuery] = useState('');

  // Filtra por nome, raça, classe ou nível (string search case-insensitive)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return characters;
    return characters.filter(c => {
      const hay = [
        c.name,
        c.race ? tName('race', c.race, lang) : '',
        c.className ? tName('class', c.className, lang) : '',
        c.subclass,
        `${t('level', lang)} ${c.level || 1}`,
        c.alignment ? tName('alignment', c.alignment, lang) : '',
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [characters, query, lang]);

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        onImport(arr);
      } catch (err) {
        alert(t('importedFail', lang));
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <div className="text-center" style={{ marginBottom: 'var(--s-6)' }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>D&D 5e SRD</div>
        <h1 style={{ fontSize: '2.4rem' }}>{t('yourHeroes', lang)}</h1>
        <Filigree />
      </div>

      {characters.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><Icon name="scroll" size={56}/></div>
          <h2>{t('noHeroes', lang)}</h2>
          <p>{t('noHeroesSub', lang)}</p>
          <button className="btn btn-primary" onClick={onNew}>
            <Icon name="plus" size={18}/> {t('newCharacter', lang)}
          </button>
        </div>
      ) : (
        <>
          {characters.length > 4 && (
            <div className="char-search">
              <input
                type="search"
                className="input"
                placeholder={lang === 'pt' ? 'Buscar por nome, raça, classe…' : 'Search by name, race, class…'}
                value={query}
                onChange={e => setQuery(e.target.value)}
                aria-label={lang === 'pt' ? 'Filtrar personagens' : 'Filter characters'}
              />
              {query && (
                <span className="char-search-count">
                  {filtered.length} / {characters.length}
                </span>
              )}
            </div>
          )}
          {filtered.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--ink-secondary)', padding: 24 }}>
              {lang === 'pt' ? 'Nenhum personagem encontrado.' : 'No character found.'}
            </p>
          ) : (
            <div className="char-list">
              {filtered.map(c => (
                <button key={c.id} className="char-card" onClick={() => onOpen(c.id)}>
                  <div className="char-card-avatar">
                    {c.avatar
                      ? <img src={c.avatar} alt="" />
                      : <span>{(c.name || '?').charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="char-card-info">
                    <div className="char-card-name">{c.name || (lang === 'pt' ? 'Sem nome' : 'Unnamed')}</div>
                    <div className="char-card-sub">
                      {c.race ? tName('race', c.race, lang) : '—'} {c.className ? '· ' + tName('class', c.className, lang) : ''}
                    </div>
                    <div className="char-card-level">
                      {t('level', lang)} {c.level || 1}
                      {c.alignment ? ' · ' + tName('alignment', c.alignment, lang) : ''}
                    </div>
                  </div>
                  <Icon name="chevron-right" size={18}/>
                </button>
              ))}
            </div>
          )}
          <Filigree />
        </>
      )}

      <div className="row gap-3" style={{ flexWrap: 'wrap', justifyContent: 'center', marginTop: 'var(--s-5)' }}>
        {characters.length > 0 && (
          <button className="btn btn-primary" onClick={onNew}>
            <Icon name="plus" size={18}/> {t('newCharacter', lang)}
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => fileRef.current && fileRef.current.click()}>
          <Icon name="upload" size={16}/> {t('importJson', lang)}
        </button>
        {characters.length > 0 && (
          <button className="btn btn-ghost" onClick={onExportAll}>
            <Icon name="download" size={16}/> {t('exportAll', lang)}
          </button>
        )}
        <input ref={fileRef} type="file" accept="application/json" onChange={handleImport} style={{ display: 'none' }} />
      </div>
    </>
  );
};

export default CharacterList;

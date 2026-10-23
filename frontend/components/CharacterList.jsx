/* Tela inicial: seus heróis primeiro e "criar" sempre à mão.
 * Estados: carregando (esqueleto), erro (Tentar de novo), sem fichas (3 portas para
 * começar) e com fichas (cartões, fichas prontas, atalhos, mais opções e a barra fixa
 * "Novo personagem" no celular). Visual e regras em src/home/. */
import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { HERO_ART, backgroundArt, hideOnError } from '../src/art.js';
import Icon from './Icons.jsx';
import { t } from '../data/i18n.js';
import { useAuth } from '../src/auth/AuthContext.jsx';
import HeroCard from '../src/home/HeroCard.jsx';
import { HomeActions, HomeLinks, HomeTitle, ImportError } from '../src/home/HomeActions.jsx';
import { L, filterCharacters, sortRecent, readFlag, writeFlag } from '../src/home/home-utils.js';
import { PregenHead, pregenSectionClass } from '../src/pregens/PregenHead.jsx';
import '../src/home/home.css';

const loadGallery = () => import('../src/pregens/PregenGallery.jsx');
const PregenGallery = lazy(loadGallery);
// Só lista o arquivo (não baixa nada): sem data/pregens.json a porta "Ficha pronta" nem aparece.
const HAS_PREGENS = Object.keys(import.meta.glob('../data/pregens.json')).length > 0;
const HINT_KEY = 'forja:home-local-hint';

// Lupa do campo de busca (o conjunto de ícones do app não tem uma).
const SearchGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21" />
  </svg>
);

/** Fichas prontas. O substituto do Suspense é o mesmo cabeçalho (mesma altura):
 * a porta do meio não "pula" quando o chunk da galeria chega. */
function Pregens({ lang, onPick, startOpen, variant }) {
  const fallback = (() => {
    const open = readFlag('forja:pregens-open', startOpen);
    return (
      <section className={pregenSectionClass(variant, open)} aria-busy="true">
        <PregenHead lang={lang} variant={variant} open={open} />
        {open && <div className="pg-grid"><p className="muted pg-note">{L(lang, 'Carregando…', 'Loading…')}</p></div>}
      </section>
    );
  })();
  return (
    <Suspense fallback={fallback}>
      <PregenGallery lang={lang} onPick={onPick} startOpen={startOpen} variant={variant} />
    </Suspense>
  );
}

const CharacterList = ({
  lang, characters, listState = 'ready', onOpen, onNew, onImport, onImportPdf, onExportAll, onBlankPdf, onPickPregen,
  onRetry, onLogin, onCampaigns, onGrimoire,
}) => {
  const auth = useAuth();
  const fileRef = useRef(null);
  const searchRef = useRef(null);
  const importFrom = useRef('more');
  const [query, setQuery] = useState('');
  const [importError, setImportError] = useState(null); // { where: 'door' | 'more', msg }
  const [hintOn, setHintOn] = useState(() => readFlag(HINT_KEY, true));
  // Esqueleto só se a lista demorar (> 250 ms): carga rápida não pisca.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (listState !== 'loading') { setSlow(false); return undefined; }
    const timer = setTimeout(() => setSlow(true), 250);
    return () => clearTimeout(timer);
  }, [listState]);

  const showPregens = !!onPickPregen && HAS_PREGENS;
  // A galeria vem em chunk próprio: começa a baixar já, junto com a lista.
  useEffect(() => { if (showPregens) loadGallery().catch(() => { /* tenta de novo ao montar */ }); }, [showPregens]);

  const sorted = useMemo(() => sortRecent(characters), [characters]);
  const filtered = useMemo(() => filterCharacters(sorted, query, lang), [sorted, query, lang]);

  const mode = listState === 'loading' ? 'loading' : listState === 'error' ? 'error' : characters.length ? 'list' : 'empty';
  const online = auth.backendAvailable !== false;
  const showHint = mode === 'list' && hintOn && online && !auth.user && !auth.loading && !!onLogin;

  const pickFile = (where) => {
    importFrom.current = where;
    setImportError(null);
    if (fileRef.current) fileRef.current.click();
  };
  const handleImport = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) { onImportPdf(file); return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        onImport(arr);
      } catch (err) {
        // Antes era o aviso nativo do navegador; agora a mensagem fica junto do botão usado.
        setImportError({ where: importFrom.current, msg: t('importedFail', lang) });
      }
    };
    reader.readAsText(file);
  };
  const clearSearch = () => { setQuery(''); searchRef.current?.focus(); };
  const dismissHint = () => { setHintOn(false); writeFlag(HINT_KEY, false); };

  const n = characters.length;
  const links = (first) => (
    <HomeLinks lang={lang} auth={auth} first={first} titleId="home-links-t"
      onGrimoire={onGrimoire} onCampaigns={onCampaigns} onLogin={onLogin} />
  );
  const actions = (
    <HomeActions lang={lang} hasChars={mode === 'list'} titleId="home-more-t"
      onPickFile={() => pickFile('more')} onBlankPdf={onBlankPdf} onExportAll={onExportAll}
      importError={importError?.where === 'more' ? importError.msg : null} />
  );

  return (
    <div className={`home is-${mode}`}>
      <header className="home-top">
        <img className="home-top-art" src={HERO_ART} alt="" decoding="async" onError={hideOnError} />
        <div className="home-top-text">
          <p className="home-eyebrow">D&D 5e SRD</p>
          <div className="home-top-line">
            <h1 className="home-title"><span className="home-foil">{t('yourHeroes', lang)}</span></h1>
            {mode === 'list' && <span className="home-count">{n} {n === 1 ? L(lang, 'herói', 'hero') : L(lang, 'heróis', 'heroes')}</span>}
          </div>
          {mode === 'empty' && (
            <p className="home-lede"><b>{t('noHeroes', lang)}.</b> {t('noHeroesSub', lang)}</p>
          )}
        </div>
        {mode === 'list' && (
          <button type="button" className="btn btn-primary home-top-new" onClick={onNew}>
            <Icon name="plus" size={18} /> {t('newCharacter', lang)}
          </button>
        )}
      </header>

      {showHint && (
        <div className="home-account" role="note">
          <span className="home-account-ico" aria-hidden="true">i</span>
          <p>{L(lang, 'Suas fichas ficam salvas só neste navegador. Entre para guardar na sua conta e jogar em mesas.', 'Your characters are saved only in this browser. Log in to keep them in your account and play at tables.')}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onLogin}>{L(lang, 'Entrar', 'Log in')}</button>
          <button type="button" className="home-x" onClick={dismissHint} aria-label={L(lang, 'Dispensar aviso', 'Dismiss notice')}><Icon name="x" size={16} /></button>
        </div>
      )}

      {mode === 'empty' ? (
        <>
          <section className="home-start" aria-labelledby="home-start-t">
            <HomeTitle id="home-start-t">{L(lang, 'Como você quer começar?', 'How do you want to start?')}</HomeTitle>
            <div className="home-doors">
              <section className="home-door home-door-create">
                <img className="home-door-art" src={backgroundArt('guildArtisan')} alt="" decoding="async" onError={hideOnError} />
                <div className="home-door-body">
                  <h3 className="home-door-title">
                    <button type="button" className="home-door-btn" onClick={onNew}>{L(lang, 'Criar meu herói', 'Create my hero')}</button>
                  </h3>
                  <p>{L(lang, 'Passo a passo, cada escolha explicada.', 'Step by step, every choice explained.')}</p>
                </div>
                <Icon name="chevron-right" size={20} />
              </section>
              {showPregens && <Pregens lang={lang} onPick={onPickPregen} startOpen variant="door" />}
              <section className="home-door home-door-file">
                <img className="home-door-art" src={backgroundArt('scribe')} alt="" decoding="async" onError={hideOnError} />
                <div className="home-door-body">
                  <h3 className="home-door-title">
                    <button type="button" className="home-door-btn" onClick={() => pickFile('door')}>{L(lang, 'Já tenho uma ficha', 'I already have a character')}</button>
                  </h3>
                  <p>{L(lang, 'Importar um arquivo .json da Forja ou um PDF de ficha preenchível.', 'Import a Forge .json file or a fillable PDF sheet.')}</p>
                  <button type="button" className="home-door-link" onClick={onBlankPdf}>
                    <Icon name="download" size={14} /> {L(lang, 'Baixar ficha em PDF em branco', 'Download a blank PDF sheet')}
                  </button>
                  <ImportError lang={lang} msg={importError?.where === 'door' ? importError.msg : null} />
                </div>
                <Icon name="chevron-right" size={20} />
              </section>
            </div>
          </section>
          {links(true)}
        </>
      ) : (
        <div className="home-body">
          <div className="home-main">
            {mode === 'loading' && (
              <div className="home-skel" aria-busy="true">
                {slow && (
                  <>
                    <p className="home-skel-msg" role="status">{L(lang, 'Carregando suas fichas…', 'Loading your characters…')}</p>
                    {[0, 1, 2].map(i => <div key={i} className="home-card home-card-skel" aria-hidden="true"><span /><span /></div>)}
                  </>
                )}
              </div>
            )}

            {mode === 'error' && (
              <div className="home-error" role="alert">
                <h2>{L(lang, 'Não consegui carregar suas fichas', 'I couldn’t load your characters')}</h2>
                <p>{auth.user
                  ? L(lang, 'Não consegui carregar suas fichas do servidor. Elas não foram apagadas.', 'I couldn’t load your characters from the server. They were not deleted.')
                  : L(lang, 'Não consegui ler as fichas salvas neste navegador. Nada foi apagado.', 'I couldn’t read the characters saved in this browser. Nothing was deleted.')}</p>
                <div className="home-error-actions">
                  {onRetry && <button type="button" className="btn btn-primary" onClick={onRetry}>{L(lang, 'Tentar de novo', 'Try again')}</button>}
                  <button type="button" className="btn btn-ghost" onClick={onNew}><Icon name="plus" size={16} /> {t('newCharacter', lang)}</button>
                </div>
              </div>
            )}

            {mode === 'list' && (
              <>
                {/* Título da seção para leitor de tela (o H1 acima é o da página): H1 → H2 → H3 de cada herói */}
                <h2 className="home-sr">{L(lang, 'Suas fichas', 'Your characters')}</h2>
                {n > 4 && (
                  <div className="home-find" role="search">
                    <div className="home-find-box">
                      <SearchGlyph />
                      <input ref={searchRef} type="search" className="input" value={query} onChange={e => setQuery(e.target.value)}
                        placeholder={L(lang, 'Buscar nome, classe…', 'Search name, class…')}
                        aria-label={L(lang, 'Filtrar personagens', 'Filter characters')} />
                      {query && <span className="home-find-count" aria-live="polite">{filtered.length} / {n}</span>}
                      {query && (
                        <button type="button" className="home-x" onClick={clearSearch} aria-label={L(lang, 'Limpar busca', 'Clear search')}>
                          <Icon name="x" size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {filtered.length === 0 ? (
                  <div className="home-noresult">
                    <p><b>{L(lang, 'Nenhum personagem encontrado.', 'No character found.')}</b></p>
                    <p>{L(lang, 'Busque por nome, classe, subclasse, espécie ou “nível 3”.', 'Search by name, class, subclass, species or “level 3”.')}</p>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={clearSearch}>{L(lang, 'Limpar busca', 'Clear search')}</button>
                  </div>
                ) : (
                  <div className="home-cards">
                    {filtered.map(c => <HeroCard key={c.id} c={c} lang={lang} onOpen={onOpen} />)}
                  </div>
                )}
              </>
            )}

            {(mode === 'list' || mode === 'error') && showPregens && (
              <Pregens lang={lang} onPick={onPickPregen} startOpen={false} variant={mode === 'list' ? 'list' : undefined} />
            )}
          </div>

          {mode !== 'loading' && (
            <aside className="home-side">
              {links(false)}
              {actions}
            </aside>
          )}
        </div>
      )}

      {/* Celular e tablet: "Novo personagem" fixo embaixo, com a vaga do dado à direita. */}
      {mode === 'list' && (
        <div className="home-dock">
          <button type="button" className="btn btn-primary" onClick={onNew}>
            <Icon name="plus" size={18} /> {t('newCharacter', lang)}
          </button>
          <span className="home-dock-slot" aria-hidden="true" />
        </div>
      )}

      <input ref={fileRef} type="file" accept="application/json,.json,application/pdf,.pdf" onChange={handleImport} style={{ display: 'none' }} />
    </div>
  );
};

export default CharacterList;

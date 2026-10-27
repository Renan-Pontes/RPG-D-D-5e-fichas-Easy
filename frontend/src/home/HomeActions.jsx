/* Tela inicial: "Atalhos" (Grimório, Campanhas / jogar com um grupo) e "Mais opções"
 * (importar, PDF em branco, exportar). Cada linha diz o que faz, sem depender do title. */
import { useEffect, useRef, useState } from 'react';
import Icon from '../../components/Icons.jsx';
import { CAMPAIGN_COVERS, GRIMOIRE_ART, hideOnError } from '../art.js';
import { L } from './home-utils.js';

const TAVERN_ART = (CAMPAIGN_COVERS.find(c => c.id === 'cozy-tavern') || CAMPAIGN_COVERS[0])?.src;

/** Título de seção: losango dourado + h2 em caixa-alta + filete até o fim. */
export function HomeTitle({ children, id, extra }) {
  return (
    <div className="home-ptitle">
      <span className="home-gem" aria-hidden="true" />
      <h2 id={id}>{children}</h2>
      {extra}
    </div>
  );
}

/** Linha de lista: ícone ou miniatura, título, explicação e chevron (alvo ≥ 56 px). */
function Row({ icon, art, title, desc, onClick, children }) {
  return (
    <li className="home-row-item">
      <button type="button" className="home-row" onClick={onClick}>
        <span className="home-row-ico" aria-hidden="true">
          {art ? <img src={art} alt="" loading="lazy" decoding="async" onError={hideOnError} /> : null}
          {icon && <Icon name={icon} size={18} />}
        </span>
        <span className="home-row-txt">
          <b>{title}</b>
          {desc && <span>{desc}</span>}
        </span>
        <Icon name="chevron-right" size={16} />
      </button>
      {children}
    </li>
  );
}

/**
 * Atalhos. Grimório sempre (até offline); Campanhas com login; "Jogar com um grupo"
 * com o servidor no ar e sem login. `first`: textos de quem ainda não tem fichas.
 */
export function HomeLinks({ lang, auth, onGrimoire, onCampaigns, onLogin, first = false, titleId }) {
  const online = auth.backendAvailable !== false;
  const campaigns = online && auth.user && onCampaigns;
  const group = online && !auth.user && !auth.loading && onLogin;
  if (!onGrimoire && !campaigns && !group) return null;
  return (
    <section className="home-links" aria-labelledby={titleId}>
      <HomeTitle id={titleId}>{first ? L(lang, 'Primeira vez no D&D?', 'First time playing D&D?') : L(lang, 'Atalhos', 'Shortcuts')}</HomeTitle>
      <ul className="home-rows">
        {onGrimoire && <Row art={GRIMOIRE_ART} title={first ? L(lang, 'Aprenda o básico em 5 páginas', 'Learn the basics in 5 pages') : L(lang, 'Grimório', 'Grimoire')}
          desc={first ? L(lang, 'No Grimório: as regras explicadas com exemplos, como um amigo explicaria.', 'In the Grimoire: the rules explained with examples, the way a friend would.')
            : L(lang, 'Regras explicadas, com exemplos.', 'Rules explained, with examples.')}
          onClick={onGrimoire} />}
        {campaigns && (
          <Row art={TAVERN_ART} title={L(lang, 'Campanhas', 'Campaigns')}
            desc={L(lang, 'Suas mesas, convites com código e a Tela.', 'Your tables, invite codes and the screen.')}
            onClick={onCampaigns} />
        )}
        {group && (
          <Row art={TAVERN_ART} title={first ? L(lang, 'Vai jogar com um grupo?', 'Playing with a group?') : L(lang, 'Jogar com um grupo', 'Play with a group')}
            desc={L(lang, 'Entre para criar uma mesa como mestre ou entrar com o código do seu mestre.', 'Log in to run a table as the DM or join with your DM’s code.')}
            onClick={onLogin} />
        )}
      </ul>
    </section>
  );
}

/** Mensagem do JSON inválido (no lugar do alert), junto do botão que foi usado. */
export function ImportError({ lang, msg }) {
  if (!msg) return null;
  return (
    <p className="home-import-err" role="alert">
      {String(msg).replace(/[.:]?\s*$/, '.')} {L(lang, 'O arquivo não parece uma ficha da Forja.', 'The file does not look like a Forge character.')}
    </p>
  );
}

/** Mais opções: Importar, Ficha em PDF em branco e (com fichas) Exportar todas. */
export function HomeActions({ lang, hasChars, onPickFile, onBlankPdf, onExportAll, importError, titleId }) {
  const [exported, setExported] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const exportAll = () => {
    onExportAll();
    setExported(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setExported(false), 4000);
  };
  return (
    <section className="home-more" aria-labelledby={titleId}>
      <HomeTitle id={titleId}>{L(lang, 'Mais opções', 'More options')}</HomeTitle>
      <ul className="home-rows">
        <Row icon="upload" title={L(lang, 'Importar ficha', 'Import a character')}
          desc={L(lang, 'Arquivo .json da Forja (uma ou várias fichas) ou PDF de ficha preenchível.', 'A Forge .json file (one or many characters) or a fillable PDF sheet.')}
          onClick={onPickFile}>
          <ImportError lang={lang} msg={importError} />
        </Row>
        <Row icon="download" title={L(lang, 'Ficha em PDF em branco', 'Blank PDF sheet')}
          desc={L(lang, 'Para imprimir ou preencher no leitor de PDF; depois dá para importar aqui.', 'To print or fill in any PDF reader; you can import it back here.')}
          onClick={onBlankPdf} />
        {hasChars && (
          // "✓ Baixado" por 4 s no lugar da explicação: fica onde a pessoa tocou.
          <Row icon={exported ? 'check' : 'download'} title={L(lang, 'Exportar todas (backup)', 'Export all (backup)')}
            desc={exported
              ? <span className="home-done">{L(lang, '✓ Baixado: forja-de-herois-characters.json', '✓ Downloaded: forja-de-herois-characters.json')}</span>
              : L(lang, 'Baixa um arquivo .json com todas as suas fichas.', 'Downloads a .json file with all your characters.')}
            onClick={exportAll}>
            <p className="home-sr" role="status">{exported ? L(lang, 'Baixado: forja-de-herois-characters.json', 'Downloaded: forja-de-herois-characters.json') : ''}</p>
          </Row>
        )}
      </ul>
    </section>
  );
}

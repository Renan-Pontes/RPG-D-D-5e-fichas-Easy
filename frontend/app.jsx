/* Main app orchestrator */
import { errorMessage } from './src/api/errors.js';
import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import Utils from './utils.js';
import { t } from './data/i18n.js';
import Icon from './components/Icons.jsx';
import { AppHeader, Toast, Modal } from './components/Shared.jsx';
import DiceRoller from './components/DiceRoller.jsx';
import CharacterList from './components/CharacterList.jsx';
import Creator from './components/Creator.jsx';
import CreatorWizard from './src/creator/CreatorWizard.jsx';
import Sheet from './components/Sheet.jsx';

import { useAuth } from './src/auth/AuthContext.jsx';
import AuthScreen from './src/auth/AuthScreen.jsx';
import { createStorageAdapter } from './src/api/storage.js';
import { api } from './src/api/client.js';
import CampaignList from './src/campaigns/CampaignList.jsx';
import CampaignDetail from './src/campaigns/CampaignDetail.jsx';
import ProgressionPanel from './src/progression/ProgressionPanel.jsx';
import { applyAutosToCharacter, applyLevelUpChoices, applyLevelChoice, applyClassOptions, revertLastLevel } from './src/progression/engine.js';
import LevelUpModal from './src/progression/LevelUpModal.jsx';
import { ClassOptionsModal } from './src/progression/ClassOptionsPicker.jsx';
import InviteChoice from './src/campaigns/InviteChoice.jsx';
import { parseJoinRoute, savePendingInvite, loadPendingInvite, joinToast, joinFailMessage } from './src/creator/creation.js';
import { parseCampaignRoute } from './src/shell/shell-logic.js';

const AdminScreen = lazy(() => import('./src/admin/AdminScreen.jsx'));
// Grimório (regras para jogadores): chunk próprio, só carrega quando aberto.
const GrimoireScreen = lazy(() => import('./src/grimoire/GrimoireScreen.jsx'));

const SCREENS = {
  HOME: 'home', CREATE: 'create', SHEET: 'sheet', EDIT: 'edit',
  AUTH: 'auth', CAMPAIGNS: 'campaigns', CAMPAIGN: 'campaign', GRIMOIRE: 'grimoire', ADMIN: 'admin',
};

const App = () => {
  const auth = useAuth();
  const [lang, setLang] = useState(() => localStorage.getItem('dnd5e-forge:lang') || ((navigator.language || '').startsWith('pt') ? 'pt' : 'en'));
  const [screen, setScreen] = useState(SCREENS.HOME);
  const [characters, setCharacters] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [editingChar, setEditingChar] = useState(null);
  const [toast, setToast] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Grimório: aberto pelo cabeçalho ou por link #grimorio/<regra> (volta pra tela anterior).
  const [grimoire, setGrimoire] = useState(null); // { id, q, from }
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const openGrimoire = useCallback((id = null, q = '') => {
    const prev = screenRef.current;
    setGrimoire(g => ({ id, q, from: prev === SCREENS.GRIMOIRE ? (g?.from || SCREENS.HOME) : prev }));
    setScreen(SCREENS.GRIMOIRE);
  }, []);
  useEffect(() => {
    const onHash = () => {
      const m = /^#(?:grimorio|grimoire)(?:\/([^?]*))?(?:\?q=(.*))?$/i.exec(window.location.hash);
      if (m) openGrimoire(m[1] ? decodeURIComponent(m[1]) : null, m[2] ? decodeURIComponent(m[2]) : '');
    };
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [openGrimoire]);

  // F5 dentro da campanha: #c/<slug>/<área>/<sub> reabre a mesma campanha (a
  // área é lida pelo CampaignDetail). Espera o login; sem conta, fica guardada
  // até a pessoa entrar.
  const pendingRoute = useRef(parseCampaignRoute(window.location.hash));
  useEffect(() => {
    const r = pendingRoute.current;
    if (!r || r.consumed || auth.loading || !auth.user) return;
    pendingRoute.current = { ...r, consumed: true }; // solto quando a tela da campanha abrir
    setActiveCampaignId(r.slug);
    setScreen(SCREENS.CAMPAIGN);
  }, [auth.loading, auth.user]);
  // Saiu da campanha: tira o #c/… da URL (senão o F5 levaria de volta para lá).
  useEffect(() => {
    if (screen === SCREENS.CAMPAIGN) {
      if (pendingRoute.current?.consumed) pendingRoute.current = null;
      return;
    }
    if (pendingRoute.current) return;
    if (/^#c\//.test(window.location.hash)) {
      try { history.replaceState(history.state, '', window.location.pathname + window.location.search); } catch { /* ok */ }
    }
  }, [screen]);

  // Adapter de storage: muda quando o login muda
  const storage = useMemo(() => createStorageAdapter({ remote: !!auth.user }), [auth.user]);

  // Expor user id global para componentes filhos (CampaignDetail usa)
  useEffect(() => {
    window.__currentUserId__ = auth.user?.id;
  }, [auth.user]);

  useEffect(() => { localStorage.setItem('dnd5e-forge:lang', lang); }, [lang]);

  // Carregar personagens (local ou remoto)
  const refreshCharacters = useCallback(async () => {
    if (auth.loading) return;
    try {
      const list = await storage.list();
      setCharacters(list);
    } catch (e) {
      console.error('failed to load characters', e);
      setCharacters([]);
    }
  }, [storage, auth.loading]);

  useEffect(() => { refreshCharacters(); }, [refreshCharacters]);

  // Login/cadastro concluído: sai da tela de entrada.
  useEffect(() => { if (auth.user && screen === SCREENS.AUTH) setScreen(SCREENS.HOME); }, [auth.user, screen]);

  // Migração toast
  useEffect(() => {
    if (auth.migrated > 0) {
      setToast(lang === 'pt' ? `${auth.migrated} personagem(s) migrado(s) para sua conta.` : `${auth.migrated} character(s) migrated to your account.`);
    }
  }, [auth.migrated, lang]);

  // Abrir ficha compartilhada: #s=<token> (link curto, 24h) ou #share=<json> (links antigos).
  useEffect(() => {
    const hash = window.location.hash;
    const importShared = (data) => {
      if (!data || !data.name) return;
      const fresh = { ...data, id: Utils.uid(), updatedAt: Date.now() };
      return storage.save(fresh).then(saved => {
        refreshCharacters();
        setActiveId(saved.id);
        setScreen(SCREENS.SHEET);
        setToast(lang === 'pt' ? 'Personagem importado!' : 'Character imported!');
        history.replaceState(null, '', window.location.pathname);
      });
    };
    if (hash.startsWith('#s=')) {
      api.getShare(hash.slice(3)).then(res => importShared(res.character)).catch(() => {
        setToast(lang === 'pt' ? 'Este link expirou (vale 24h) ou não existe.' : 'This link has expired (valid for 24h) or does not exist.');
        history.replaceState(null, '', window.location.pathname);
      });
    } else if (hash.startsWith('#share=')) {
      try { importShared(Utils.decodeChar(hash.slice(7))); } catch (e) { console.error('share parse fail', e); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storage]);

  // Convite: /join/<código> ou #join=<código>. Guarda o código (sobrevive ao login/F5) e limpa a URL.
  const [pendingInvite, setPendingInvite] = useState(() => parseJoinRoute(window.location.pathname, window.location.hash) || loadPendingInvite());
  const [inviteJoin, setInviteJoin] = useState(null);         // mesa verificada para o assistente
  const [campaignJoinCode, setCampaignJoinCode] = useState(null); // "Usar um personagem que já tenho"
  const [joinRetry, setJoinRetry] = useState(null);           // { join, characterId, charName, msg }
  const [joinRetrying, setJoinRetrying] = useState(false);
  const inviteAuthRedirect = useRef(false);
  useEffect(() => {
    const take = () => {
      const code = parseJoinRoute(window.location.pathname, window.location.hash);
      if (!code) return;
      savePendingInvite(code);
      setPendingInvite(code);
      inviteAuthRedirect.current = false;
      history.replaceState(null, '', '/');
    };
    take();
    window.addEventListener('hashchange', take);
    return () => window.removeEventListener('hashchange', take);
  }, []);
  const clearPendingInvite = useCallback(() => { savePendingInvite(null); setPendingInvite(null); }, []);
  // Sem login: leva à entrada (uma vez); depois do login, a escolha aparece sozinha.
  useEffect(() => {
    if (!pendingInvite || auth.loading) return;
    if (auth.backendAvailable === false) {
      setToast(lang === 'pt' ? 'O convite precisa do servidor, que está fora do ar agora. Tente o link de novo mais tarde.' : 'The invite needs the server, which is offline right now. Try the link again later.');
      clearPendingInvite();
      return;
    }
    if (!auth.user && !inviteAuthRedirect.current) {
      inviteAuthRedirect.current = true;
      setScreen(SCREENS.AUTH);
    }
  }, [pendingInvite, auth.loading, auth.user, auth.backendAvailable, lang, clearPendingInvite]);

  const active = characters.find(c => c.id === activeId);

  // Entra na mesa com a ficha recém-salva. Se falhar, a ficha continua salva e fica o aviso com "Tentar de novo".
  const joinTable = async (join, characterId, charName) => {
    try {
      const res = await api.joinCampaign({ inviteCode: join.code, characterId });
      setJoinRetry(null);
      await refreshCharacters();
      setActiveCampaignId(res.slug || join.slug || res.campaignId || join.campaignId);
      setScreen(SCREENS.CAMPAIGN);
      setToast(joinToast(charName, join.name, lang));
      return true;
    } catch (e) {
      console.warn('join after create failed', e);
      setJoinRetry({ join, characterId, charName, msg: joinFailMessage(e, join) });
      return false;
    }
  };

  const retryJoin = async () => {
    if (!joinRetry || joinRetrying) return;
    setJoinRetrying(true);
    try { await joinTable(joinRetry.join, joinRetry.characterId, joinRetry.charName); }
    finally { setJoinRetrying(false); }
  };

  // join: mesa escolhida no assistente (opcional). Os outros usos chamam só handleSaveNew(char).
  const handleSaveNew = async (char, { join = null } = {}) => {
    const withAutos = applyAutosToCharacter(char);
    const saved = await storage.save(withAutos);
    await refreshCharacters();
    setActiveId(saved.id);
    setEditingChar(null);
    setInviteJoin(null);
    if (join && auth.user && saved?.id != null) {
      if (await joinTable(join, saved.id, saved.name || char.name)) return;
      setScreen(SCREENS.SHEET);
      return;
    }
    setScreen(SCREENS.SHEET);
    setToast(t('saved', lang));
  };

  // Ficha pronta (Comece rápido): vira uma cópia do jogador. A foto vira data URL para o PDF usar.
  const handlePickPregen = async (pregen) => {
    let avatar = pregen.character.avatar || '';
    if (avatar && !avatar.startsWith('data:')) {
      // JPEG 400px, como as fotos enviadas (o PDF só embute JPEG/PNG).
      try {
        avatar = await new Promise((ok, fail) => {
          const img = new Image();
          img.onload = () => {
            const side = Math.min(img.width, img.height, 400);
            const c = document.createElement('canvas');
            c.width = c.height = side;
            const s = Math.min(img.width, img.height);
            c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, side, side);
            ok(c.toDataURL('image/jpeg', 0.82));
          };
          img.onerror = fail;
          img.src = avatar;
        });
      } catch { avatar = ''; }
    }
    const char = { ...pregen.character, avatar, id: Utils.uid(), createdAt: Date.now(), updatedAt: Date.now() };
    await handleSaveNew(char);
  };

  const handleUpdate = async (char) => {
    const withAutos = applyAutosToCharacter(char);
    await storage.save(withAutos);
    await refreshCharacters();
  };

  const handleDelete = (id) => {
    setConfirm({
      msg: lang === 'pt' ? 'Excluir este personagem? Esta ação é permanente.' : 'Delete this character? This is permanent.',
      onConfirm: async () => {
        await storage.remove(id);
        await refreshCharacters();
        setScreen(SCREENS.HOME);
        setActiveId(null);
        setConfirm(null);
        setToast(t('deleted', lang));
      }
    });
  };

  const handleExport = (char) => {
    const blob = new Blob([JSON.stringify(char, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(char.name || 'character').replace(/[^a-z0-9]/gi, '_')}.json`;
    a.click();
    setToast(t('exported', lang));
  };

  const handleExportAll = () => {
    const blob = new Blob([JSON.stringify(characters, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'forja-de-herois-characters.json';
    a.click();
  };

  const handleImport = async (arr) => {
    let imported = 0;
    for (const c of arr) {
      const fresh = { ...c, id: undefined, updatedAt: Date.now() };
      try { await storage.save(fresh); imported++; } catch (e) { console.warn(e); }
    }
    await refreshCharacters();
    setToast(lang === 'pt' ? `${imported} de ${arr.length} fichas importadas.` : `${imported} of ${arr.length} characters imported.`);
  };

  // PDF no layout da ficha oficial de D&D 5e (pdf-lib só carrega quando usado).
  const handleExportPdf = async (char, { flatten = false, blank = false } = {}) => {
    try {
      const [{ downloadDnd5ePdf }, { speciesSummary }] = await Promise.all([
        import('./src/pdf/export-pdf.js'), import('./src/progression/SpeciesChoices.jsx'),
      ]);
      await downloadDnd5ePdf(char, lang, { speciesSummary, flatten, blank });
      setToast(lang === 'pt' ? 'PDF gerado.' : 'PDF created.');
    } catch (e) {
      console.error(e);
      setToast(lang === 'pt' ? 'Falha ao gerar o PDF.' : 'Failed to create the PDF.');
    }
  };

  const handleImportPdf = async (file) => {
    try {
      const { importDnd5ePdf } = await import('./src/pdf/import-pdf.js');
      const { char, unmatched, fieldCount } = await importDnd5ePdf(new Uint8Array(await file.arrayBuffer()));
      if (!fieldCount) {
        setToast(lang === 'pt'
          ? 'Esse PDF não tem campos preenchíveis: só dá pra importar fichas de formulário (ficha oficial, D&D Beyond ou exportada daqui).'
          : 'This PDF has no form fields: only fillable sheets can be imported (official sheet, D&D Beyond or exported here).');
        return;
      }
      if (!char) {
        setToast(lang === 'pt'
          ? 'Esse PDF está em branco: preencha a ficha no leitor de PDF, salve e importe de novo.'
          : 'This PDF is blank: fill in the sheet in your PDF reader, save it and import again.');
        return;
      }
      await storage.save(applyAutosToCharacter(char));
      await refreshCharacters();
      setToast(lang === 'pt'
        ? `Ficha importada${unmatched.length ? ` — ${unmatched.length} item(ns) não reconhecido(s), veja as anotações.` : '.'}`
        : `Character imported${unmatched.length ? ` — ${unmatched.length} unrecognized item(s), see notes.` : '.'}`);
    } catch (e) {
      console.error(e);
      setToast(t('importedFail', lang));
    }
  };

  // Link curto: a ficha fica 24h no servidor e o link leva só o código. Precisa de conta.
  const handleShare = async (char) => {
    if (!auth.user) {
      setToast(lang === 'pt' ? 'Entre na sua conta para gerar um link de compartilhamento.' : 'Log in to create a share link.');
      return;
    }
    try {
      const { token } = await api.createShare(char);
      const url = `${window.location.origin}${window.location.pathname}#s=${token}`;
      navigator.clipboard.writeText(url).then(
        () => setToast(lang === 'pt' ? 'Link copiado! Ele vale por 24 horas.' : 'Link copied! It is valid for 24 hours.'),
        () => prompt(t('shareLink', lang), url)
      );
    } catch (e) {
      setToast(lang === 'pt' ? 'Falha ao gerar link.' : 'Failed to generate link.');
    }
  };

  // Imprimir = PDF ornamentado (texto fixo + livro de magias) no visualizador do navegador.
  // A aba abre já no clique (senão o bloqueador de pop-up barra) e recebe o PDF quando ficar pronto.
  const handlePrint = async () => {
    const tab = window.open('', '_blank');
    if (tab) tab.document.write(`<p style="font-family:sans-serif;padding:24px">${lang === 'pt' ? 'Preparando a ficha para impressão…' : 'Preparing the sheet for printing…'}</p>`);
    try {
      const [{ printDnd5ePdf, downloadDnd5ePdf }, { speciesSummary }] = await Promise.all([
        import('./src/pdf/export-pdf.js'), import('./src/progression/SpeciesChoices.jsx'),
      ]);
      const opened = await printDnd5ePdf(active, lang, { speciesSummary }, tab);
      if (!opened) {
        await downloadDnd5ePdf(active, lang, { speciesSummary, flatten: true, spellbook: true });
        setToast(lang === 'pt' ? 'Pop-up bloqueado: o PDF foi baixado — abra e imprima.' : 'Pop-up blocked: the PDF was downloaded — open it and print.');
      }
    } catch (e) {
      console.error(e);
      if (tab) tab.close();
      setToast(lang === 'pt' ? 'Falha ao gerar o PDF.' : 'Failed to create the PDF.');
    }
  };

  // Approval levelup liberada (status='approved') pro personagem ativo.
  // Null quando não há, ou {id, campaignId, toLevel} quando o jogador pode consumir.
  const [unlockedLevelup, setUnlockedLevelup] = useState(null);

  // Modal de subida guiada: { mode: 'local' | 'consume' | 'choice', level? }.
  const [levelUpFlow, setLevelUpFlow] = useState(null);

  // Fora de campanha: aplica as escolhas do modal direto na ficha.
  const applyLocalLevelUp = useCallback(async (char, choices) => {
    if (choices.toLevel > 20 || choices.toLevel !== (char.level || 1) + 1) return;
    await storage.save(applyLevelUpChoices(char, choices));
    await refreshCharacters();
    setToast(lang === 'pt' ? `Nível ${choices.toLevel}! ✨` : `Level ${choices.toLevel}! ✨`);
  }, [storage, refreshCharacters, lang]);

  const handleLevelUpConfirm = async (choices) => {
    if (!active || !levelUpFlow) return;
    if (levelUpFlow.mode === 'local') return applyLocalLevelUp(active, choices);
    if (levelUpFlow.mode === 'consume') {
      const { hpGain, choice, spellsAdded, classId, skillAdded, options } = choices;
      await api.consumeApproval(unlockedLevelup.id, { hpGain, choice, spellsAdded, classId, skillAdded, options });
      await refreshCharacters();
      setUnlockedLevelup(null);
      setToast(lang === 'pt' ? `Nível ${choices.toLevel}! ✨` : `Level ${choices.toLevel}! ✨`);
      return;
    }
    // 'choice': ASI/talento pendente de um nível já alcançado.
    if (typeof active.id === 'number') {
      await api.levelChoice(active.id, { level: levelUpFlow.level, choice: choices.choice });
    } else {
      await storage.save(applyLevelChoice(active, levelUpFlow.level, choices.choice));
    }
    await refreshCharacters();
    setToast(lang === 'pt' ? 'Escolha registrada ✨' : 'Choice saved ✨');
  };

  // Opções de classe pendentes (invocações etc.) ou troca livre, fora da subida de nível.
  const handleClassOptions = async (classId, picks) => {
    if (!active) return;
    if (typeof active.id === 'number') await api.classOptions(active.id, { classId, ...picks });
    else await storage.save(applyClassOptions(active, classId, picks));
    await refreshCharacters();
    setToast(lang === 'pt' ? 'Escolhas registradas ✨' : 'Choices saved ✨');
  };

  const handleLevelUpRequest = async () => {
    if (!active) return;

    // Já liberado pelo mestre: vai direto pra subida guiada.
    if (unlockedLevelup) { setLevelUpFlow({ mode: 'consume' }); return; }

    // Fora de campanha (ou sem login) — sobe direto, com escolhas.
    if (!auth.user || !active.inCampaign) {
      setLevelUpFlow({ mode: 'local' });
      return;
    }

    // Logado: descobre se este personagem está em campanha.
    let camps = [];
    try {
      const r = await api.characterCampaigns(active.id);
      camps = r.campaigns || [];
    } catch (e) {
      console.warn('characterCampaigns failed', e);
    }

    // Sem campanha — sobe com escolhas (storage remoto se logado).
    if (camps.length === 0) {
      setLevelUpFlow({ mode: 'local' });
      return;
    }

    // Em campanha — envia solicitação pro mestre liberar.
    const targetCamp = camps[0];
    try {
      await api.createApproval(targetCamp.id, {
        characterId: active.id,
        type: 'levelup',
        payload: { toLevel: (active.level || 1) + 1 },
        note: lang === 'pt' ? `Solicitação automática de subida de nível.` : `Automated level-up request.`,
      });
      setToast(lang === 'pt'
        ? `Solicitação enviada para "${targetCamp.name}". Aguarde o mestre liberar.`
        : `Request sent to "${targetCamp.name}". Waiting for DM unlock.`);
    } catch (e) {
      setToast(errorMessage(e));
    }
  };

  // Fora de campanha: volta um nível desfazendo o que a subida trouxe.
  const handleLevelDown = async () => {
    if (!active || active.inCampaign || (active.level || 1) <= 1) return;
    const to = active.level - 1;
    const ok = window.confirm(lang === 'pt'
      ? `Voltar para o nível ${to}? PV, classe, aumento de atributo/talento e magias ganhos no nível ${active.level} serão desfeitos.`
      : `Go back to level ${to}? HP, ability increase/feat and spells gained at level ${active.level} will be undone.`);
    if (!ok) return;
    let next = revertLastLevel(active);
    // Classe que voltou para antes do nível de subclasse perde a subclasse.
    for (const e of Utils.classEntries(next)) {
      if (!e.subclass || e.level >= Utils.subclassLevel(Utils.classView(next, e))) continue;
      next = e.primary
        ? { ...next, subclass: '', landType: '' }
        : { ...next, multiclass: next.multiclass.map(m => m.id === e.id ? { ...m, subclass: '', landType: '' } : m) };
    }
    const slots = Utils.spellSlots(next);
    if (Array.isArray(next.spellSlotsUsed)) next.spellSlotsUsed = next.spellSlotsUsed.map((u, i) => Math.min(u || 0, slots[i] || 0));
    await storage.save(applyAutosToCharacter(next));
    await refreshCharacters();
    setToast(lang === 'pt' ? `Voltou ao nível ${to}.` : `Back to level ${to}.`);
  };

  const handleConsumeLevelup = () => {
    if (unlockedLevelup) setLevelUpFlow({ mode: 'consume' });
  };

  // Detecta approval liberada pro personagem ativo (polling leve no boot/troca de ficha).
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!auth.user || !active) { setUnlockedLevelup(null); return; }
      try {
        const r = await api.characterCampaigns(active.id);
        const camps = r.campaigns || [];
        for (const c of camps) {
          const lr = await api.listApprovals(c.id);
          const unlocked = (lr.approvals || []).find(a =>
            a.status === 'approved' && a.type === 'levelup' && a.character?.id === active.id
          );
          if (unlocked && alive) {
            setUnlockedLevelup({ id: unlocked.id, campaignId: c.id, toLevel: unlocked.payload?.toLevel, allowMulticlass: unlocked.payload?.allowMulticlass !== false });
            return;
          }
        }
        if (alive) setUnlockedLevelup(null);
      } catch (e) {
        if (alive) setUnlockedLevelup(null);
      }
    })();
    return () => { alive = false; };
  }, [active?.id, auth.user?.id]);

  // === Render ===
  let content;
  switch (screen) {
    case SCREENS.GRIMOIRE:
      content = (
        <Suspense fallback={<div className="muted" style={{ padding: 24 }}>{lang === 'pt' ? 'Abrindo o Grimório…' : 'Opening the Grimoire…'}</div>}>
          <GrimoireScreen lang={lang} initialId={grimoire?.id} initialQuery={grimoire?.q || ''}
            onBack={() => setScreen(grimoire?.from && grimoire.from !== SCREENS.GRIMOIRE ? grimoire.from : SCREENS.HOME)} />
        </Suspense>
      );
      break;
    case SCREENS.AUTH:
      content = <AuthScreen lang={lang} onSkip={() => setScreen(SCREENS.HOME)} />;
      break;
    case SCREENS.ADMIN:
      content = auth.user?.isAdmin
        ? <Suspense fallback={<p className="muted">…</p>}><AdminScreen lang={lang} onBack={() => setScreen(SCREENS.HOME)} /></Suspense>
        : <p className="muted">{lang === 'pt' ? 'Acesso só para administradores.' : 'Admins only.'}</p>;
      break;
    case SCREENS.CAMPAIGNS:
      content = (
        <CampaignList
          lang={lang}
          characters={characters}
          joinCode={campaignJoinCode}
          onJoinCodeUsed={() => setCampaignJoinCode(null)}
          onToast={setToast}
          onOpen={(c) => { setActiveCampaignId(c.id); setScreen(SCREENS.CAMPAIGN); }}
          onBack={() => setScreen(SCREENS.HOME)}
        />
      );
      break;
    case SCREENS.CAMPAIGN:
      content = (
        <CampaignDetail
          lang={lang}
          campaignId={activeCampaignId}
          characters={characters}
          onBack={() => setScreen(SCREENS.CAMPAIGNS)}
        />
      );
      break;
    case SCREENS.HOME:
      content = (
        <CharacterList
          lang={lang}
          characters={characters}
          onOpen={(id) => { setActiveId(id); setScreen(SCREENS.SHEET); }}
          onNew={() => { setEditingChar(null); setInviteJoin(null); setScreen(SCREENS.CREATE); }}
          onImport={handleImport}
          onImportPdf={handleImportPdf}
          onExportAll={handleExportAll}
          onBlankPdf={() => handleExportPdf({}, { blank: true })}
          onPickPregen={handlePickPregen}
        />
      );
      break;
    case SCREENS.CREATE:
    case SCREENS.EDIT:
      // Ficha nova: assistente passo a passo (src/creator). Editar ficha existente: editor antigo.
      content = !editingChar ? (
        <CreatorWizard
          key={inviteJoin?.code || 'new'}
          lang={lang}
          initialJoin={inviteJoin}
          joinEnabled={!!auth.user && auth.backendAvailable !== false}
          onSave={handleSaveNew}
          onCancel={() => { setInviteJoin(null); setScreen(activeId ? SCREENS.SHEET : SCREENS.HOME); }}
        />
      ) : (
        <Creator
          lang={lang}
          initial={editingChar}
          onSave={handleSaveNew}
          onCancel={() => {
            setEditingChar(null);
            if (activeId) setScreen(SCREENS.SHEET);
            else setScreen(SCREENS.HOME);
          }}
        />
      );
      break;
    case SCREENS.SHEET:
      if (!active) { setScreen(SCREENS.HOME); return null; }
      content = (
        <>
          <Sheet
            lang={lang}
            char={active}
            onUpdate={handleUpdate}
            onEdit={() => { setEditingChar(active); setScreen(SCREENS.EDIT); }}
            onPrint={handlePrint}
            onExportPdf={opts => handleExportPdf(active, opts)}
            onShare={() => handleShare(active)}
            onExport={() => handleExport(active)}
            onDelete={() => handleDelete(active.id)}
            onBack={() => setScreen(SCREENS.HOME)}
            onLevelUp={handleLevelUpRequest}
          >
            <div style={{ marginTop: 'var(--s-6)' }}>
              <ProgressionPanel
                character={active}
                lang={lang}
                canRequestLevelUp
                onLevelUpRequest={handleLevelUpRequest}
                onLevelDown={handleLevelDown}
                unlockedLevelup={unlockedLevelup}
                onConsumeLevelup={handleConsumeLevelup}
                onResolveChoice={(level) => setLevelUpFlow({ mode: 'choice', level })}
                onResolveOptions={(classId) => setLevelUpFlow({ mode: 'options', classId })}
              />
            </div>
          </Sheet>
          {levelUpFlow?.mode === 'options' && (
            <ClassOptionsModal char={active} classId={levelUpFlow.classId} lang={lang}
              onConfirm={handleClassOptions} onClose={() => setLevelUpFlow(null)} />
          )}
          {levelUpFlow && levelUpFlow.mode !== 'options' && (
            <LevelUpModal
              char={active}
              lang={lang}
              onlyChoiceLevel={levelUpFlow.mode === 'choice' ? levelUpFlow.level : null}
              allowMulticlass={levelUpFlow.mode === 'consume' ? unlockedLevelup?.allowMulticlass !== false : true}
              onConfirm={handleLevelUpConfirm}
              onClose={() => setLevelUpFlow(null)}
            />
          )}
        </>
      );
      break;
  }

  // Quando backend não responde, esconde botões de auth/campanhas (offline mode)
  const backendOff = auth.backendAvailable === false;
  const headerRight = (
    <>
      <button className={`btn btn-ghost btn-sm header-grimoire ${screen === SCREENS.GRIMOIRE ? 'active' : ''}`}
        onClick={() => openGrimoire()} title={lang === 'pt' ? 'Grimório: regras explicadas' : 'Grimoire: rules explained'}>
        <Icon name="book" size={14}/> <span className="header-grimoire-label">{lang === 'pt' ? 'Grimório' : 'Grimoire'}</span>
      </button>
      {auth.user?.isAdmin && !backendOff && (
        <button className={`btn btn-ghost btn-sm ${screen === SCREENS.ADMIN ? 'active' : ''}`} onClick={() => setScreen(SCREENS.ADMIN)}>
          Admin
        </button>
      )}
      {auth.user && !backendOff && (
        <button className="btn btn-ghost btn-sm" onClick={() => setScreen(SCREENS.CAMPAIGNS)}>
          {lang === 'pt' ? 'Campanhas' : 'Campaigns'}
        </button>
      )}
      {auth.loading || backendOff ? null : auth.user ? (
        <UserChip
          user={auth.user}
          open={userMenuOpen}
          setOpen={setUserMenuOpen}
          onLogout={async () => { await auth.logout(); setUserMenuOpen(false); setScreen(SCREENS.HOME); }}
          lang={lang}
        />
      ) : (
        <button className="btn btn-ghost btn-sm" onClick={() => setScreen(SCREENS.AUTH)}>
          {lang === 'pt' ? 'Entrar' : 'Log in'}
        </button>
      )}
    </>
  );

  return (
    <>
      <AppHeader
        lang={lang}
        setLang={setLang}
        onHome={() => { setScreen(SCREENS.HOME); setActiveId(null); }}
        right={headerRight}
      />
      {auth.backendAvailable === false && (
        <div className="offline-banner" role="status" aria-live="polite">
          ⚠ {lang === 'pt'
            ? <>Backend offline — funcionando em modo <strong>standalone</strong> (fichas salvas só neste navegador). Login, campanhas e mestre voltam sozinhos quando o servidor responder.</>
            : <>Backend offline — running in <strong>standalone</strong> mode (sheets saved only in this browser). Login, campaigns and DM features come back automatically once the server responds.</>
          }
        </div>
      )}
      <main id="main" className={`container ${screen === SCREENS.CAMPAIGN || screen === SCREENS.GRIMOIRE || screen === SCREENS.ADMIN ? 'container-wide' : ''}`} tabIndex={-1}>
        {screen === SCREENS.AUTH && pendingInvite && !auth.user && (
          <div className="join-hint" role="status" style={{ marginBottom: 'var(--s-4)' }}>
            {lang === 'pt'
              ? <>Você recebeu um convite para uma mesa (código <span className="mono">{pendingInvite}</span>). Entre ou crie sua conta para continuar.</>
              : <>You got an invite to a table (code <span className="mono">{pendingInvite}</span>). Log in or sign up to continue.</>}
          </div>
        )}
        {joinRetry && screen !== SCREENS.CAMPAIGN && screen !== SCREENS.CREATE && (
          <div className="join-retry" role="alert">
            <span className="join-retry-msg">{joinRetry.msg[lang] || joinRetry.msg.pt}</span>
            <span className="join-retry-actions">
              {joinRetry.msg.retry && (
                <button type="button" className="btn btn-primary btn-sm" onClick={retryJoin} disabled={joinRetrying}>
                  {joinRetrying ? (lang === 'pt' ? 'Tentando…' : 'Trying…') : (lang === 'pt' ? 'Tentar de novo' : 'Try again')}
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setJoinRetry(null)}>{lang === 'pt' ? 'Dispensar' : 'Dismiss'}</button>
            </span>
          </div>
        )}
        {content}
      </main>
      {pendingInvite && auth.user && !auth.loading && (
        <InviteChoice
          code={pendingInvite}
          lang={lang}
          hasCharacters={characters.some(c => typeof c.id === 'number')}
          onClose={clearPendingInvite}
          onCreate={(join) => { clearPendingInvite(); setEditingChar(null); setInviteJoin(join); setScreen(SCREENS.CREATE); }}
          onUseExisting={(join) => { clearPendingInvite(); setCampaignJoinCode(join.code); setScreen(SCREENS.CAMPAIGNS); }}
        />
      )}
      <DiceRoller lang={lang} />
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
      {confirm && (
        <Modal onClose={() => setConfirm(null)}>
          <p style={{ marginBottom: 16, color: 'var(--ink-secondary)' }}>{confirm.msg}</p>
          <div className="row gap-3" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setConfirm(null)}>{t('cancel', lang)}</button>
            <button className="btn btn-danger" onClick={confirm.onConfirm}>{t('confirm', lang)}</button>
          </div>
        </Modal>
      )}
    </>
  );
};

function UserChip({ user, open, setOpen, onLogout, lang }) {
  const initials = (user.displayName || user.email || '?').slice(0, 1).toUpperCase();
  return (
    <div style={{ position: 'relative' }}>
      <button className="user-chip" onClick={() => setOpen(!open)}>
        <span className="avatar">{initials}</span>
        <span className="user-chip-name">{user.displayName}</span>
      </button>
      {open && (
        <div className="user-chip-menu" onClick={e => e.stopPropagation()}>
          <div style={{ padding: '6px 10px', fontSize: '0.85em', color: 'var(--ink-secondary)' }}>{user.email}</div>
          <button className="menu-item danger" onClick={onLogout}>
            {lang === 'pt' ? 'Sair' : 'Log out'}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;

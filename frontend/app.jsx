/* Main app orchestrator */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Utils from './utils.js';
import { t } from './data/i18n.js';
import Icon from './components/Icons.jsx';
import { AppHeader, Toast, Modal } from './components/Shared.jsx';
import DiceRoller from './components/DiceRoller.jsx';
import CharacterList from './components/CharacterList.jsx';
import Creator from './components/Creator.jsx';
import Sheet from './components/Sheet.jsx';
import PrintSheet from './components/PrintSheet.jsx';

import { useAuth } from './src/auth/AuthContext.jsx';
import AuthScreen from './src/auth/AuthScreen.jsx';
import { createStorageAdapter } from './src/api/storage.js';
import { api } from './src/api/client.js';
import CampaignList from './src/campaigns/CampaignList.jsx';
import CampaignDetail from './src/campaigns/CampaignDetail.jsx';
import ProgressionPanel from './src/progression/ProgressionPanel.jsx';
import { applyAutosToCharacter } from './src/progression/engine.js';

const SCREENS = {
  HOME: 'home', CREATE: 'create', SHEET: 'sheet', EDIT: 'edit', PRINT: 'print',
  AUTH: 'auth', CAMPAIGNS: 'campaigns', CAMPAIGN: 'campaign',
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

  // Migração toast
  useEffect(() => {
    if (auth.migrated > 0) {
      setToast(lang === 'pt' ? `${auth.migrated} personagem(s) migrado(s) para sua conta.` : `${auth.migrated} character(s) migrated to your account.`);
    }
  }, [auth.migrated, lang]);

  // Compartilhar via URL hash (compatibilidade)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#share=')) {
      try {
        const data = Utils.decodeChar(hash.slice(7));
        if (data && data.name) {
          const fresh = { ...data, id: Utils.uid(), updatedAt: Date.now() };
          storage.save(fresh).then(saved => {
            refreshCharacters();
            setActiveId(saved.id);
            setScreen(SCREENS.SHEET);
            setToast(lang === 'pt' ? 'Personagem importado!' : 'Character imported!');
            history.replaceState(null, '', window.location.pathname);
          });
        }
      } catch (e) { console.error('share parse fail', e); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storage]);

  const active = characters.find(c => c.id === activeId);

  const handleSaveNew = async (char) => {
    const withAutos = applyAutosToCharacter(char);
    const saved = await storage.save(withAutos);
    await refreshCharacters();
    setActiveId(saved.id);
    setEditingChar(null);
    setScreen(SCREENS.SHEET);
    setToast(t('saved', lang));
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
    for (const c of arr) {
      const fresh = { ...c, id: undefined, updatedAt: Date.now() };
      try { await storage.save(fresh); } catch (e) { console.warn(e); }
    }
    await refreshCharacters();
    setToast(t('imported', lang));
  };

  const handleShare = (char) => {
    try {
      const encoded = Utils.encodeChar(char);
      const url = `${window.location.origin}${window.location.pathname}#share=${encoded}`;
      navigator.clipboard.writeText(url).then(
        () => setToast(t('linkCopied', lang)),
        () => prompt(t('shareLink', lang), url)
      );
    } catch (e) {
      setToast(lang === 'pt' ? 'Falha ao gerar link.' : 'Failed to generate link.');
    }
  };

  const handlePrint = () => {
    setScreen(SCREENS.PRINT);
    setTimeout(() => window.print(), 250);
  };

  // Approval levelup liberada (status='approved') pro personagem ativo.
  // Null quando não há, ou {id, campaignId, toLevel} quando o jogador pode consumir.
  const [unlockedLevelup, setUnlockedLevelup] = useState(null);

  // Aplica level-up local diretamente — standalone (sem campanha) ou após consume remoto.
  const applyLocalLevelUp = useCallback(async (char, toLevel) => {
    const next = { ...char, level: toLevel };
    const withAutos = applyAutosToCharacter(next);
    await storage.save(withAutos);
    await refreshCharacters();
    setToast(lang === 'pt' ? `Nível ${toLevel}! ✨` : `Level ${toLevel}! ✨`);
  }, [storage, refreshCharacters, lang]);

  const handleLevelUpRequest = async () => {
    if (!active) return;

    // Standalone (sem login) — aplica direto.
    if (!auth.user) {
      await applyLocalLevelUp(active, (active.level || 1) + 1);
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

    // Sem campanha — aplica direto (storage remoto se logado).
    if (camps.length === 0) {
      await applyLocalLevelUp(active, (active.level || 1) + 1);
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
      setToast(e?.data?.error || e?.message || 'Falha ao enviar.');
    }
  };

  const handleConsumeLevelup = async () => {
    if (!unlockedLevelup) return;
    try {
      const res = await api.consumeApproval(unlockedLevelup.id);
      // Backend retorna o character.data novo. Recarrega lista pra refletir.
      await refreshCharacters();
      setUnlockedLevelup(null);
      const newLevel = res?.character?.data?.level;
      setToast(lang === 'pt' ? `Nível ${newLevel}! ✨` : `Level ${newLevel}! ✨`);
    } catch (e) {
      setToast(e?.data?.error || e?.message || 'Falha ao consumir.');
    }
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
            setUnlockedLevelup({ id: unlocked.id, campaignId: c.id, toLevel: unlocked.payload?.toLevel });
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
    case SCREENS.AUTH:
      content = <AuthScreen lang={lang} onSkip={() => setScreen(SCREENS.HOME)} />;
      break;
    case SCREENS.CAMPAIGNS:
      content = (
        <CampaignList
          lang={lang}
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
          onNew={() => { setEditingChar(null); setScreen(SCREENS.CREATE); }}
          onImport={handleImport}
          onExportAll={handleExportAll}
        />
      );
      break;
    case SCREENS.CREATE:
    case SCREENS.EDIT:
      content = (
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
            onShare={() => handleShare(active)}
            onExport={() => handleExport(active)}
            onDelete={() => handleDelete(active.id)}
            onBack={() => setScreen(SCREENS.HOME)}
          />
          <div className="container">
            <ProgressionPanel
              character={active}
              lang={lang}
              canRequestLevelUp
              onLevelUpRequest={handleLevelUpRequest}
              unlockedLevelup={unlockedLevelup}
              onConsumeLevelup={handleConsumeLevelup}
            />
          </div>
        </>
      );
      break;
    case SCREENS.PRINT:
      content = (
        <div className="print-preview-frame">
          <div className="no-print print-toolbar">
            <button className="btn btn-ghost btn-sm" onClick={() => setScreen(SCREENS.SHEET)}>
              <Icon name="arrow-back" size={14}/> {t('back', lang)}
            </button>
            <div className="print-toolbar-title">{lang === 'pt' ? 'Visualização de impressão' : 'Print preview'}</div>
            <button className="btn btn-primary" onClick={() => window.print()}>
              <Icon name="print" size={14}/> {t('print', lang)}
            </button>
          </div>
          <PrintSheet char={active} lang={lang} />
        </div>
      );
      break;
  }

  // Quando backend não responde, esconde botões de auth/campanhas (offline mode)
  const backendOff = auth.backendAvailable === false;
  const headerRight = (
    <>
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
            ? <>Backend offline — funcionando em modo <strong>standalone</strong> (fichas salvas só neste navegador). Auth, campanhas e mestre ficam indisponíveis até configurar <code>VITE_API_URL</code> no projeto Vercel.</>
            : <>Backend offline — running in <strong>standalone</strong> mode (sheets saved only in this browser). Auth, campaigns and DM features unavailable until <code>VITE_API_URL</code> is set on the Vercel project.</>
          }
        </div>
      )}
      <main id="main" className="container" tabIndex={-1}>
        {content}
      </main>
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
        <span>{user.displayName}</span>
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

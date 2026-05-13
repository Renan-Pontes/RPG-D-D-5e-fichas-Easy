/* Main app orchestrator */
import { useState, useEffect } from 'react';
import Utils from './utils.js';
import { t } from './data/i18n.js';
import Icon from './components/Icons.jsx';
import { AppHeader, Toast, Modal } from './components/Shared.jsx';
import DiceRoller from './components/DiceRoller.jsx';
import CharacterList from './components/CharacterList.jsx';
import Creator from './components/Creator.jsx';
import Sheet from './components/Sheet.jsx';
import PrintSheet from './components/PrintSheet.jsx';

const SCREENS = { HOME: 'home', CREATE: 'create', SHEET: 'sheet', EDIT: 'edit', PRINT: 'print' };

const App = () => {
  const [lang, setLang] = useState(() => localStorage.getItem('dnd5e-forge:lang') || ((navigator.language || '').startsWith('pt') ? 'pt' : 'en'));
  const [screen, setScreen] = useState(SCREENS.HOME);
  const [characters, setCharacters] = useState(() => Utils.loadAll());
  const [activeId, setActiveId] = useState(null);
  const [editingChar, setEditingChar] = useState(null);
  const [toast, setToast] = useState('');
  const [confirm, setConfirm] = useState(null); // {msg, onConfirm}

  useEffect(() => { localStorage.setItem('dnd5e-forge:lang', lang); }, [lang]);

  // Handle ?share= on load
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#share=')) {
      try {
        const data = Utils.decodeChar(hash.slice(7));
        if (data && data.name) {
          data.id = Utils.uid();
          data.updatedAt = Date.now();
          const all = [...characters, data];
          setCharacters(all);
          Utils.saveAll(all);
          setActiveId(data.id);
          setScreen(SCREENS.SHEET);
          setToast(lang === 'pt' ? 'Personagem importado!' : 'Character imported!');
          history.replaceState(null, '', window.location.pathname);
        }
      } catch (e) { console.error('share parse fail', e); }
    }
  }, []);

  const refreshCharacters = () => setCharacters(Utils.loadAll());

  const active = characters.find(c => c.id === activeId);

  const handleSaveNew = (char) => {
    Utils.saveChar(char);
    refreshCharacters();
    setActiveId(char.id);
    setEditingChar(null);
    setScreen(SCREENS.SHEET);
    setToast(t('saved', lang));
  };

  const handleUpdate = (char) => {
    Utils.saveChar(char);
    refreshCharacters();
  };

  const handleDelete = (id) => {
    setConfirm({
      msg: lang === 'pt' ? 'Excluir este personagem? Esta ação é permanente.' : 'Delete this character? This is permanent.',
      onConfirm: () => {
        Utils.deleteChar(id);
        refreshCharacters();
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

  const handleImport = (arr) => {
    const fresh = arr.map(c => ({ ...c, id: Utils.uid(), updatedAt: Date.now() }));
    const all = [...characters, ...fresh];
    setCharacters(all);
    Utils.saveAll(all);
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

  // === Render ===
  let content;
  switch (screen) {
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
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
              <Icon name="print" size={14}/> {t('print', lang)}
            </button>
          </div>
          <PrintSheet char={active} lang={lang} />
        </div>
      );
      break;
  }

  return (
    <>
      <AppHeader
        lang={lang}
        setLang={setLang}
        onHome={() => { setScreen(SCREENS.HOME); setActiveId(null); }}
      />
      <main className="container">
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

export default App;

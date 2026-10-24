/* Preparar › Itens da campanha: catálogo mecânico do mestre (cadastrar, editar, remover).
 * O formulário abre numa folha da mesa (MesaSheet) e a lista fica por baixo; a
 * entrega aos jogadores é o "Dar item" de Grupo › Jogadores (botão de 44 aqui). */
import { errorMessage } from '../api/errors.js';
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import ItemForm, { typeLabel, dmgTypeLabel, rarityLabel, weightLabel } from './ItemForm.jsx';
import usePrepConfirm from '../prep/usePrepConfirm.jsx';
import MesaSheet from '../shell/MesaSheet.jsx';
import MesaTitle from '../shell/MesaTitle.jsx';
import './items-styles.css';
import { itemArt, itemEmoji } from '../art.js';
import ArtThumb from '../components/ArtThumb.jsx';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);
const text = (v, lang) => (typeof v === 'string' ? v : v?.[lang] || v?.en || '');

export default function CampaignItemsTab({ campaign, lang, goTo }) {
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | {id, item}
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [confirm, confirmEl] = usePrepConfirm(lang);

  const load = () => api.campaignItems(campaign.id)
    .then(r => setItems(r.items || []))
    .catch(e => { setError(errorMessage(e, lang)); setItems(i => i || []); });
  useEffect(() => { load(); }, [campaign.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const say = (s) => { setMsg(s); setTimeout(() => setMsg(m => (m === s ? '' : m)), 3500); };

  const save = async (item) => {
    if (editing === 'new') await api.createCampaignItem(campaign.id, item);
    else await api.updateCampaignItem(campaign.id, editing.id, item);
    setEditing(null);
    say(t(lang, `“${item.name}” salvo no catálogo.`, `“${item.name}” saved to the catalog.`));
    await load();
  };

  const remove = async (row) => {
    const ok = await confirm({
      title: t(lang, `Remover “${row.item.name}” do catálogo?`, `Remove “${row.item.name}” from the catalog?`),
      text: t(lang, 'Quem já recebeu o item continua com ele.', 'Characters who already got it keep it.'),
      ok: t(lang, 'Remover', 'Remove'), danger: true,
    });
    if (!ok) return;
    try { await api.deleteCampaignItem(campaign.id, row.id); await load(); } catch (e) { setError(errorMessage(e, lang)); }
  };

  return (
    <div className="ci">
      <div className="ci-head">
        <MesaTitle as="h2">{t(lang, 'Itens da campanha', 'Campaign items')}</MesaTitle>
        <p className="ci-intro">
          {t(lang,
            'O tesouro do seu mundo, com as regras prontas. Só você vê esta lista; entregue pelo “Dar item” em Grupo › Jogadores ou como tesouro de uma sala das Aventuras.',
            'Your world’s treasure, rules included. Only you see this list; hand items out with “Give item” under Party › Players or as treasure in an Adventure room.')}
        </p>
        <div className="ci-head-actions">
          <button type="button" className="mesa-btn mesa-btn-lg is-primary" onClick={() => setEditing('new')}>＋ {t(lang, 'Cadastrar item', 'Add item')}</button>
          {goTo && (
            <button type="button" className="mesa-btn ci-to-group" onClick={() => goTo('group', 'players')}>
              🎁 {t(lang, 'Entregar a um jogador → Grupo', 'Give to a player → Party')}
            </button>
          )}
        </div>
      </div>
      {error && <p className="prep-error" role="alert">{error}</p>}
      {msg && <p className="prep-msg" role="status">{msg}</p>}
      {items === null && <p className="muted">{t(lang, 'Carregando…', 'Loading…')}</p>}
      {items && !items.length && (
        <div className="ci-empty">
          <p>{t(lang, 'Nenhum item ainda. Que tal a espada do vilão ou uma poção rara?', 'No items yet. How about the villain’s sword or a rare potion?')}</p>
          <button type="button" className="mesa-btn mesa-btn-lg is-primary" onClick={() => setEditing('new')}>＋ {t(lang, 'Cadastrar o primeiro', 'Add the first one')}</button>
        </div>
      )}
      <ul className="ci-grid">
        {(items || []).map(row => {
          const it = row.item;
          const magic = !!it.magic;
          const meta = [
            it.weapon && `⚔ ${it.weapon.damage} ${dmgTypeLabel(it.weapon.dmgType, lang)}`,
            it.armor && `🛡 ${t(lang, 'CA', 'AC')} ${it.armor.ac}`,
            it.weight != null && weightLabel(it.weight, lang),
            it.cost != null && `${it.cost} ${t(lang, 'PO', 'GP')}`,
          ].filter(Boolean).join(' · ');
          const name = text(it.name, lang) || it.name;
          return (
            <li key={row.id} className={`ci-card mesa-panel ${magic ? 'is-magic' : ''} r-${(it.magic?.rarity || '').replace(/\s+/g, '-')}`}>
              <div className="ci-card-top">
                <ArtThumb src={itemArt(it)} emoji={itemEmoji(it)} size={48} lang={lang} />
                <div className="ci-title">
                  <strong>{name}</strong>
                  <span className="ci-type">{typeLabel(it.type, lang)}
                    {magic && <> · <span className="ci-rarity">{rarityLabel(it.magic.rarity, lang)}</span>{it.magic.attunement ? t(lang, ' · exige sintonia', ' · requires attunement') : ''}</>}
                  </span>
                </div>
              </div>
              {meta && <div className="ci-meta">{meta}</div>}
              {magic && text(it.magic.effect, lang) && <p className="ci-effect">{text(it.magic.effect, lang)}</p>}
              {it.description && text(it.description, lang) && <p className="ci-desc">{text(it.description, lang)}</p>}
              <div className="ci-actions">
                <button type="button" className="mesa-btn" onClick={() => setEditing(row)}
                  aria-label={t(lang, `Editar ${name}`, `Edit ${name}`)}>✎ {t(lang, 'Editar', 'Edit')}</button>
                <button type="button" className="mesa-btn ci-del" onClick={() => remove(row)}
                  aria-label={t(lang, `Remover ${name}`, `Remove ${name}`)}>{t(lang, 'Remover', 'Remove')}</button>
              </div>
            </li>
          );
        })}
      </ul>
      {editing && (
        <MesaSheet
          icon="💎"
          eyebrow={t(lang, 'Itens da campanha', 'Campaign items')}
          title={editing === 'new' ? t(lang, 'Novo item', 'New item') : t(lang, 'Editar item', 'Edit item')}
          size="full" width="md" lang={lang}
          onClose={() => setEditing(null)}
          className="ci-sheet" bodyClassName="ci-sheet-body is-form"
          initialFocus={editing === 'new' ? '.item-form input' : undefined}
        >
          <ItemForm lang={lang} sheet initial={editing === 'new' ? null : editing.item} submitLabel={t(lang, 'Salvar', 'Save')} onSubmit={save} onCancel={() => setEditing(null)} />
        </MesaSheet>
      )}
      {confirmEl}
    </div>
  );
}

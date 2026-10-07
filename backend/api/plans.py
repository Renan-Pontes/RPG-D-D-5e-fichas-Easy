"""
Planos da Forja — limites, uso, vagas de mesa e ciclo de encerramento de campanha.

O site precisa ser VIÁVEL (teto de custo ~R$ 50/mês), não maximizar lucro. Por
isso só se limita o que custa, sempre no TOTAL da conta (nunca por campanha):

  * imagens (MB)  — um único "saco" que o mestre distribui entre campanhas:
                    imagens do Mundo, capas, retratos dos próprios personagens,
                    mapas de combate e de aventura (data URLs guardadas no banco).
                    Arte estática do site (/art, mapa do mundo de exemplo) não conta.
  * campanhas     — como mestre; contam Ativas + Encerradas ainda no prazo.
  * personagens   — próprios; personagem em VAGA DE MESA (Membership.sponsored)
                    não conta enquanto a campanha existir.
  * cartões do Mundo: sem limite comercial; teto técnico MAX_CARDS_PER_CAMPAIGN.

ESTOURAR LIMITE NUNCA APAGA DADOS: só bloqueia criar coisa nova daquele tipo
(PlanLimitExceeded → 402 {error:'plan_limit', limit, used, max, plan, next}).

Campanha encerrada ("Apagar campanha"): fica somente leitura por
CLOSED_GRACE_DAYS (escritas → 423 {error:'campaign_closed'}); o mestre pode
reabrir. Depois do prazo, purge_expired() apaga a campanha (mundo, aventuras,
diário…) e decide as fichas em vaga emprestada pela OPÇÃO A: se o jogador tem
espaço no próprio plano a ficha fica com ele; se não, é apagada. Sem tarefa
agendada (PythonAnywhere free): a purga é preguiçosa e idempotente — roda ao
listar campanhas/personagens, no login e no comando `purge_closed_campaigns`.

Pagamento ainda não existe: start_checkout() / apply_payment() são o ponto de
integração com o Mercado Pago.
"""
import os
from datetime import timedelta
from functools import wraps

from django.conf import settings
from django.contrib.auth.signals import user_logged_in
from django.db import transaction
from django.db.models import Count, Sum
from django.db.models.fields.json import KT
from django.db.models.functions import Length
from django.http import JsonResponse
from django.utils import timezone
from rest_framework.exceptions import APIException

from .models import (AddOn, Adventure, Campaign, Character, CombatInstance, Membership, Plan,
                     UserPlan, WorldEntry, WorldImage)

CLOSED_GRACE_DAYS = 30
MAX_CARDS_PER_CAMPAIGN = 2000
MB = 1024 * 1024
FREE_SLUG = 'free'
SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')

# Se a tabela estiver vazia (ex.: banco antigo sem a migração de dados), vale isto.
_FALLBACK_FREE = dict(slug=FREE_SLUG, name_pt='Grátis', name_en='Free', price_cents=0,
                      max_characters=3, max_campaigns=1, table_slots=0, storage_mb=25, order=0)

# limite → tipo de extra que o aumenta / campo do plano
LIMIT_ADDON_KIND = {'images': 'storage_mb', 'campaigns': 'campaigns',
                    'characters': 'characters', 'slots': 'table_slots'}
LIMIT_PLAN_FIELD = {'images': 'storage_mb', 'campaigns': 'max_campaigns',
                    'characters': 'max_characters', 'slots': 'table_slots'}


# ============================================================ contato / pagamento
def contact_email():
    return getattr(settings, 'FORJA_CONTACT_EMAIL', '') or os.environ.get('FORJA_CONTACT_EMAIL', '')


def contact_info():
    email = contact_email()
    subject = 'Forja de Heróis — quero assinar'
    return {'email': email, 'mailto': f'mailto:{email}?subject={subject.replace(" ", "%20")}' if email else ''}


def payments_enabled():
    """Liga quando a integração com o Mercado Pago existir."""
    return False


def start_checkout(user, plan_slug=None, addon_slug=None, quantity=1):
    """PONTO DE INTEGRAÇÃO do pagamento. Hoje só devolve o contato; com o Mercado
    Pago, cria a preferência de pagamento e devolve {available: True, checkoutUrl}.
    Quando o pagamento for confirmado (webhook), chame apply_payment()."""
    return {'available': False, 'reason': 'payments_coming_soon',
            'plan': plan_slug, 'addon': addon_slug, 'quantity': quantity, 'contact': contact_info()}


def apply_payment(user, plan_slug=None, addons=None, valid_until=None):
    """Aplica um pagamento confirmado (para o webhook do Mercado Pago)."""
    return assign_plan(user, plan_slug=plan_slug, addons=addons, valid_until=valid_until, source='payment')


# ============================================================ exceções
class PlanLimitExceeded(APIException):
    """402 {error:'plan_limit', limit, used, max, plan, next}. `detail` fica como
    dict cru (sem virar string) para o frontend ler os números."""
    status_code = 402
    default_code = 'plan_limit'

    def __init__(self, user, limit, used, max_value, extra=None):
        super().__init__('plan_limit')
        plan, _addons, _up = account(user) if user is not None else (free_plan(), {}, None)
        self.detail = {
            'error': 'plan_limit', 'limit': limit, 'used': used, 'max': max_value,
            'plan': plan.slug, **(extra or {}),
            'next': upgrade_hint(user, limit, used, (extra or {}).get('needed', 0)),
        }


def closed_payload(campaign):
    return {'error': 'campaign_closed', 'campaignId': campaign.id,
            'closedAt': campaign.closed_at.isoformat() if campaign.closed_at else None,
            'purgeAt': purge_at(campaign).isoformat() if purge_at(campaign) else None}


class CampaignClosed(APIException):
    status_code = 423
    default_code = 'campaign_closed'

    def __init__(self, campaign):
        super().__init__('campaign_closed')
        self.detail = closed_payload(campaign)


# ============================================================ plano da conta
def free_plan():
    return Plan.objects.filter(slug=FREE_SLUG).first() or Plan(**_FALLBACK_FREE)


def _clean_addons(raw):
    if not isinstance(raw, dict):
        return {}
    out = {}
    for k, v in raw.items():
        if isinstance(k, str) and isinstance(v, int) and not isinstance(v, bool) and v > 0:
            out[k] = min(v, 1000)
    return out


def account(user):
    """(plano efetivo, extras {slug: qtd}, UserPlan|None). Sem registro ou vencido = Grátis."""
    up = UserPlan.objects.select_related('plan').filter(user=user).first() if user and user.pk else None
    if up and (up.valid_until is None or up.valid_until > timezone.now()):
        return up.plan, _clean_addons(up.addons), up
    return free_plan(), {}, up


def limits(user):
    plan, addons, _up = account(user)
    extra = {'campaigns': 0, 'storage_mb': 0, 'characters': 0, 'table_slots': 0}
    if addons:
        for a in AddOn.objects.filter(slug__in=list(addons)):
            extra[a.kind] = extra.get(a.kind, 0) + a.amount * addons[a.slug]
    storage_mb = plan.storage_mb + extra['storage_mb']
    return {
        'characters': plan.max_characters + extra['characters'],
        'campaigns': plan.max_campaigns + extra['campaigns'],
        'slotsPerCampaign': plan.table_slots + extra['table_slots'],
        'storageMb': storage_mb,
        'storageBytes': storage_mb * MB,
        'cardsPerCampaign': MAX_CARDS_PER_CAMPAIGN,
    }


def plan_payload(plan):
    return {'slug': plan.slug, 'name': {'pt': plan.name_pt, 'en': plan.name_en},
            'priceCents': plan.price_cents, 'characters': plan.max_characters,
            'campaigns': plan.max_campaigns, 'slotsPerCampaign': plan.table_slots,
            'storageMb': plan.storage_mb, 'order': plan.order}


def addon_payload(addon, quantity=None):
    out = {'slug': addon.slug, 'name': {'pt': addon.name_pt, 'en': addon.name_en},
           'kind': addon.kind, 'amount': addon.amount, 'priceCents': addon.price_cents}
    if quantity is not None:
        out['quantity'] = quantity
    return out


def upgrade_hint(user, limit, used=None, needed=0):
    """O que resolveria esse limite (para a mensagem amigável), considerando o uso
    atual: o menor plano acima do atual cujo limite (com os extras que a conta já
    tem) passa de `used` (+ `needed`, em bytes, para imagens) e quantos pacotes do
    extra seriam precisos. Sem `used`, vale o próximo plano que dá mais."""
    if limit not in LIMIT_PLAN_FIELD:
        return None
    current = account(user)[0] if user is not None else free_plan()
    field = LIMIT_PLAN_FIELD[limit]
    unit = MB if limit == 'images' else 1
    cur_value = getattr(current, field)
    effective = cur_value * unit
    if user is not None and used is not None:
        key = {'images': 'storageBytes', 'campaigns': 'campaigns', 'characters': 'characters',
               'slots': 'slotsPerCampaign'}[limit]
        effective = limits(user)[key]
    extra_value = effective - cur_value * unit  # o que os extras atuais já dão
    if used is None:
        required = effective + 1
    elif limit == 'images':
        required = used + max(needed or 0, 1)
    else:
        required = used + 1
    nxt = None
    for p in Plan.objects.filter(active=True).order_by('order', 'price_cents'):
        if p.price_cents <= current.price_cents or getattr(p, field) <= cur_value:
            continue
        if getattr(p, field) * unit + extra_value >= required:
            nxt = p
            break
    addon = AddOn.objects.filter(active=True, kind=LIMIT_ADDON_KIND[limit]).order_by('order').first()
    quantity = None
    if addon and addon.amount > 0:
        step = addon.amount * unit
        quantity = max(1, -(-(required - effective) // step))
    return {
        'plan': {**plan_payload(nxt), 'value': getattr(nxt, field)} if nxt else None,
        'addon': {**addon_payload(addon), 'needed': quantity} if addon else None,
        'contact': contact_info(),
    }


def assign_plan(user, plan_slug=None, addons=None, valid_until=None, source='admin', note=None):
    """Atribui plano/extras (admin ou pagamento). Nunca apaga dados de quem desce de plano."""
    up = UserPlan.objects.filter(user=user).first()
    plan = Plan.objects.filter(slug=plan_slug).first() if plan_slug else (up.plan if up else free_plan())
    if plan is None or plan.pk is None:
        raise ValueError('unknown_plan')
    if addons is not None:
        known = set(AddOn.objects.values_list('slug', flat=True))
        unknown = [k for k in (addons or {}) if k not in known]
        if unknown:
            raise ValueError('unknown_addon')
    if up is None:
        up = UserPlan(user=user, plan=plan)
    up.plan = plan
    if addons is not None:
        up.addons = _clean_addons(addons)
    up.valid_until = valid_until
    up.source = source if source in ('admin', 'payment', 'free') else 'admin'
    if note is not None:
        up.note = str(note)[:200]
    up.save()
    return up


# ============================================================ uso
def counted_characters(user):
    """Personagens próprios que contam no limite (fora de vaga de mesa)."""
    return Character.objects.filter(owner=user).exclude(memberships__sponsored=True)


_SITE_IMAGE_VERS = None


def _site_image_vers():
    """Versões (hash) de imagens que são arte do site copiada para o banco — não contam."""
    global _SITE_IMAGE_VERS
    if _SITE_IMAGE_VERS is None:
        vers = set()
        try:
            from .world_sample import _map_image
            from .world_rules import image_version
            img = _map_image()
            if img:
                vers.add(image_version(img))
        except Exception:  # pragma: no cover — arte ausente não pode quebrar a conta
            pass
        _SITE_IMAGE_VERS = vers
    return _SITE_IMAGE_VERS


def adventure_image_bytes(data):
    total = 0
    for n in (data or {}).get('nodes') or []:
        img = n.get('image') if isinstance(n, dict) else None
        if isinstance(img, str) and img.startswith('data:'):
            total += len(img)
    return total


def image_usage(user):
    """Bytes de imagem guardados pela conta (tamanho real das data URLs no banco).
    → {total, world, covers, avatars, combatMaps, adventureMaps, byCampaign: {id: bytes}}"""
    by_camp = {}

    def add(cid, n):
        by_camp[cid] = by_camp.get(cid, 0) + (n or 0)

    world = 0
    rows = (WorldImage.objects.filter(entry__campaign__dm=user)
            .exclude(entry__image_ver__in=list(_site_image_vers()))
            .values('entry__campaign_id').annotate(n=Sum(Length('data'))))
    for r in rows:
        world += r['n'] or 0
        add(r['entry__campaign_id'], r['n'])
    covers = 0
    for cid, n in Campaign.objects.filter(dm=user).annotate(n=Length('cover_image')).values_list('id', 'n'):
        covers += n or 0
        add(cid, n)
    combat = 0
    rows = (CombatInstance.objects.filter(campaign__dm=user, map_data__background_image__startswith='data:')
            .annotate(n=Length(KT('map_data__background_image'))).values_list('campaign_id', 'n'))
    for cid, n in rows:
        combat += n or 0
        add(cid, n)
    adventures = 0
    for cid, data in Adventure.objects.filter(campaign__dm=user).values_list('campaign_id', 'data'):
        n = adventure_image_bytes(data)
        adventures += n
        add(cid, n)
    avatars = (Character.objects.filter(owner=user, data__avatar__startswith='data:')
               .aggregate(n=Sum(Length(KT('data__avatar'))))['n'] or 0)
    return {'total': world + covers + combat + adventures + avatars, 'world': world, 'covers': covers,
            'avatars': avatars, 'combatMaps': combat, 'adventureMaps': adventures, 'byCampaign': by_camp}


def image_bytes(value):
    return len(value) if isinstance(value, str) and value.startswith('data:') else 0


def campaigns_used(user):
    """Ativas + Encerradas ainda no prazo (as vencidas são purgadas antes)."""
    purge_expired()
    return Campaign.objects.filter(dm=user).count()


def slots_info(campaign):
    max_slots = limits(campaign.dm)['slotsPerCampaign']
    used = Membership.objects.filter(campaign=campaign, sponsored=True).count()
    return {'used': used, 'max': max_slots}


def usage(user):
    imgs = image_usage(user)
    camps = list(Campaign.objects.filter(dm=user).defer('cover_image', 'state', 'dm_settings')
                 .annotate(n_cards=Count('world', distinct=True)))
    sponsored = Character.objects.filter(owner=user, memberships__sponsored=True).distinct().count()
    lim = limits(user)
    by_campaign = []
    for c in camps:
        used_slots = Membership.objects.filter(campaign=c, sponsored=True).count()
        by_campaign.append({
            'id': c.id, 'name': c.name, 'slug': c.slug, 'status': c.status,
            'closedAt': c.closed_at.isoformat() if c.closed_at else None,
            'purgeAt': purge_at(c).isoformat() if purge_at(c) else None,
            'imageBytes': imgs['byCampaign'].get(c.id, 0), 'cards': c.n_cards,
            'slots': {'used': used_slots, 'max': lim['slotsPerCampaign']},
        })
    return {
        'characters': counted_characters(user).count(),
        'sponsoredCharacters': sponsored,
        'campaigns': len(camps),
        'activeCampaigns': sum(1 for c in camps if c.status != 'closed'),
        'closedCampaigns': sum(1 for c in camps if c.status == 'closed'),
        'storageBytes': imgs['total'],
        'storage': {k: imgs[k] for k in ('world', 'covers', 'avatars', 'combatMaps', 'adventureMaps')},
        'byCampaign': by_campaign,
    }


def account_payload(user):
    """Corpo de GET /api/me/plan (e da área admin)."""
    purge_expired()
    plan, addons, up = account(user)
    addon_objs = {a.slug: a for a in AddOn.objects.filter(slug__in=list(addons))}
    expired = bool(up and up.valid_until and up.valid_until <= timezone.now())
    return {
        'plan': plan_payload(plan),
        'addons': [addon_payload(addon_objs[s], q) for s, q in addons.items() if s in addon_objs],
        'validUntil': up.valid_until.isoformat() if up and up.valid_until and not expired else None,
        'expired': expired,
        'source': (up.source if up and not expired else 'free'),
        'limits': limits(user),
        'usage': usage(user),
        'contact': contact_info(),
        'paymentsEnabled': payments_enabled(),
    }


# ============================================================ checagens (criar coisa nova)
def check_campaign_create(user):
    lim = limits(user)['campaigns']
    used = campaigns_used(user)
    if used >= lim:
        raise PlanLimitExceeded(user, 'campaigns', used, lim)


def check_images(user, new_bytes, old_bytes=0):
    """Gravar uma imagem de `new_bytes` no lugar de uma de `old_bytes`. Trocar por
    uma menor (ou apagar) sempre pode, mesmo acima do limite."""
    if not new_bytes or new_bytes <= old_bytes:
        return
    lim = limits(user)['storageBytes']
    used = image_usage(user)['total']
    if used - old_bytes + new_bytes > lim:
        raise PlanLimitExceeded(user, 'images', used, lim, {'needed': new_bytes - old_bytes, 'unit': 'bytes'})


def check_cards(campaign, adding=1):
    used = WorldEntry.objects.filter(campaign=campaign).count()
    if used + adding > MAX_CARDS_PER_CAMPAIGN:
        raise PlanLimitExceeded(campaign.dm, 'cards', used, MAX_CARDS_PER_CAMPAIGN)


def characters_at_limit(user):
    lim = limits(user)['characters']
    used = counted_characters(user).count()
    return used >= lim, used, lim


def free_slot(campaign, exclude_membership=None):
    qs = Membership.objects.filter(campaign=campaign, sponsored=True)
    if exclude_membership is not None and exclude_membership.pk:
        qs = qs.exclude(pk=exclude_membership.pk)
    return qs.count() < limits(campaign.dm)['slotsPerCampaign']


def decide_sponsored(user, campaign, character, membership=None):
    """O personagem entra ocupando uma vaga do mestre? Sim quando o jogador já está
    no limite próprio e a mesa tem vaga livre. Quem já ocupava a vaga com a mesma
    ficha continua nela."""
    if character is None or campaign.dm_id == user.id:
        return False
    if membership is not None and membership.sponsored and membership.character_id == character.id:
        return True
    at_limit, _used, _lim = characters_at_limit(user)
    return at_limit and free_slot(campaign, exclude_membership=membership)


def check_character_create(user, campaign=None):
    """→ True se a ficha nova precisa (e pode) usar vaga da mesa; False se cabe no
    plano; PlanLimitExceeded se não cabe em nenhum dos dois."""
    at_limit, used, lim = characters_at_limit(user)
    if not at_limit:
        return False
    if campaign is not None and campaign.dm_id != user.id and free_slot(campaign):
        return True
    extra = {}
    if campaign is not None:
        extra['slots'] = slots_info(campaign)
    raise PlanLimitExceeded(user, 'characters', used, lim, extra)


def dm_display_name(user):
    prof = getattr(user, 'profile', None)
    name = getattr(prof, 'display_name', '') if prof else ''
    return name or (user.email.split('@')[0] if user.email else user.username)


# ============================================================ ciclo da campanha
def purge_at(campaign):
    if campaign.status != 'closed' or not campaign.closed_at:
        return None
    return campaign.closed_at + timedelta(days=CLOSED_GRACE_DAYS)


def require_open(campaign):
    if campaign.status == 'closed':
        raise CampaignClosed(campaign)


def close_campaign(campaign):
    """Encerra (idempotente: encerrar de novo não reinicia o prazo)."""
    if campaign.status != 'closed':
        campaign.status = 'closed'
        campaign.closed_at = timezone.now()
        campaign.save(update_fields=['status', 'closed_at', 'updated_at'])
    return campaign


def reopen_campaign(campaign):
    """Volta a ativa. Sempre pode: encerradas já contam no limite de campanhas
    (campaigns_used), então reabrir não muda o uso — e quem ficou acima do limite
    por ter descido de plano não fica preso com a campanha travada."""
    if campaign.status != 'closed':
        return campaign
    campaign.status = 'active'
    campaign.closed_at = None
    campaign.save(update_fields=['status', 'closed_at', 'updated_at'])
    return campaign


def purge_campaign(campaign):
    """Apaga de vez. Fichas em vaga emprestada — OPÇÃO A: ficam com o jogador se
    couberem no plano dele; senão são apagadas. As outras fichas só saem da mesa.
    → {campaignId, kept: [charId], deleted: [charId]}"""
    kept, deleted = [], []
    with transaction.atomic():
        ms = (Membership.objects.filter(campaign=campaign, sponsored=True, character__isnull=False)
              .select_related('character', 'character__owner').order_by('joined_at', 'id'))
        for m in ms:
            char = m.character
            Membership.objects.filter(pk=m.pk).update(sponsored=False)
            owner = char.owner
            if counted_characters(owner).count() <= limits(owner)['characters']:
                kept.append(char.id)
            else:
                deleted.append(char.id)
                char.delete()
        cid = campaign.id
        campaign.delete()
    return {'campaignId': cid, 'kept': kept, 'deleted': deleted}


def due_campaigns(now=None):
    cutoff = (now or timezone.now()) - timedelta(days=CLOSED_GRACE_DAYS)
    return Campaign.objects.filter(status='closed', closed_at__lte=cutoff).defer('cover_image')


def purge_expired(now=None):
    """Purga preguiçosa e idempotente de todas as campanhas vencidas."""
    return [purge_campaign(c) for c in due_campaigns(now)]


def _purge_on_login(sender, user, request, **kwargs):
    try:
        purge_expired()
    except Exception:  # pragma: no cover — login nunca pode falhar por causa da purga
        pass


user_logged_in.connect(_purge_on_login, dispatch_uid='forja_purge_closed_campaigns')


# ============================================================ guarda de escrita (urls.py)
def _campaign_from_slug(kwargs):
    key = kwargs.get('id_or_slug')
    if key is None:
        return None
    qs = Campaign.objects.only('id', 'dm_id', 'status', 'closed_at')
    obj = qs.filter(id=key).first() if str(key).isdigit() else None
    return obj or qs.filter(slug=key).first()


def _campaign_via(model, field='campaign'):
    def lookup(kwargs):
        pk = kwargs.get('pk')
        row = model.objects.filter(pk=pk).values_list(f'{field}_id', flat=True).first()
        return Campaign.objects.only('id', 'dm_id', 'status', 'closed_at').filter(pk=row).first() if row else None
    return lookup


def _campaign_of_character(kwargs):
    m = (Membership.objects.filter(character_id=kwargs.get('pk'))
         .select_related('campaign').only('campaign__id', 'campaign__dm_id', 'campaign__status',
                                          'campaign__closed_at').first())
    return m.campaign if m else None


LOOKUPS = {'campaign': _campaign_from_slug, 'character': _campaign_of_character}


def lookup_for(name):
    if name in LOOKUPS:
        return LOOKUPS[name]
    from . import models as M
    model = {'world': M.WorldEntry, 'approval': M.Approval, 'check': M.CheckRequest,
             'roll': M.RollRequest, 'rig': M.DiceRig}[name]
    return _campaign_via(model)


def closed_guard(view, lookup='campaign', allow=()):
    """Embrulha uma view de campanha: escrita (POST/PUT/PATCH/DELETE) em campanha
    encerrada → 423 campaign_closed. Leitura passa. `allow` = métodos liberados.
    Só responde 423 a quem é da mesa (os demais seguem para a view, que nega)."""
    find = lookup_for(lookup) if isinstance(lookup, str) else lookup

    @wraps(view)
    def guarded(request, *args, **kwargs):
        if request.method not in SAFE_METHODS and request.method not in allow:
            user = getattr(request, 'user', None)
            if user is not None and user.is_authenticated:
                camp = find(kwargs)
                if camp is not None and camp.status == 'closed' and (
                        camp.dm_id == user.id or
                        Membership.objects.filter(campaign_id=camp.id, user=user).exists()):
                    return JsonResponse(closed_payload(camp), status=423)
        return view(request, *args, **kwargs)
    guarded.csrf_exempt = True  # as views DRF fazem a própria checagem de CSRF
    return guarded

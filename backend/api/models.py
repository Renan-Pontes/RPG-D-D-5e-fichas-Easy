"""
Models do app api — fichas, campanhas, aprovações e dados.
"""
import secrets
import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone


# === Geradores ===
SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  # sem 0/O/1/I


def new_slug(n=10):
    return ''.join(secrets.choice(SLUG_ALPHABET) for _ in range(n))


def new_invite_code(n=6):
    return ''.join(secrets.choice(CODE_ALPHABET) for _ in range(n))


def new_screen_token():
    return secrets.token_hex(16)


def slugify_clean(text):
    out = []
    for ch in (text or '').lower():
        if ch.isalnum():
            out.append(ch)
        elif ch in ' -_':
            out.append('-')
    s = ''.join(out).strip('-')[:40]
    return s or new_slug()


# === Profile (para display_name) ===
class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    display_name = models.CharField(max_length=80)

    def __str__(self):
        return self.display_name


# === Character ===
class Character(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='characters')
    name = models.CharField(max_length=120)
    data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [models.Index(fields=['owner', '-updated_at'])]

    def __str__(self):
        return self.name


# === Campaign ===
class Campaign(models.Model):
    dm = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_campaigns')
    name = models.CharField(max_length=120)
    slug = models.CharField(max_length=80, unique=True)
    screen_token = models.CharField(max_length=64, unique=True, default=new_screen_token)
    invite_code = models.CharField(max_length=10, unique=True, default=new_invite_code)
    description = models.TextField(blank=True, default='')
    state = models.JSONField(default=dict)  # iniciativa, cena, sessão, etc
    # Identidade visual da campanha (capa do mestre / telão)
    tagline = models.CharField(max_length=160, blank=True, default='')
    accent = models.CharField(max_length=9, blank=True, default='')   # '#b8862b'
    tone = models.CharField(max_length=20, blank=True, default='')
    cover_image = models.TextField(blank=True, default='')            # data URL ≤ 450k; só GET próprio
    cover_ver = models.CharField(max_length=16, blank=True, default='')
    # Só o mestre vê: onboarding, advancedDice, sessionPlan (ver views_world.session_plan)
    dm_settings = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [models.Index(fields=['dm'])]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify_clean(self.name)
            slug = base
            attempt = 0
            while Campaign.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                attempt += 1
                slug = f'{base}-{new_slug(4)}'
                if attempt > 5:
                    slug = new_slug()
                    break
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


# === Membership ===
class Membership(models.Model):
    ROLE_CHOICES = [('player', 'Player'), ('dm', 'DM')]

    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='memberships')
    character = models.ForeignKey(Character, on_delete=models.SET_NULL, null=True, blank=True, related_name='memberships')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='player')
    joined_at = models.DateTimeField(auto_now_add=True)
    world_seen_at = models.DateTimeField(null=True, blank=True)  # selo "Novo!" do Mundo do jogador

    class Meta:
        unique_together = [('campaign', 'user')]
        indexes = [models.Index(fields=['user'])]


# === Approval ===
class Approval(models.Model):
    TYPE_CHOICES = [
        ('levelup', 'Level up'),
        ('feature', 'Feature'),
        ('item', 'Item'),
        ('spell', 'Spell'),
        ('other', 'Other'),
    ]
    # 'approved' = liberada pelo mestre, ainda não consumida pelo jogador.
    # 'consumed' = aplicada na ficha (level subiu, autos rodaram).
    # Pra type='levelup' a transição é approved → consumed via /consume.
    # Pra os outros types, a aplicação ainda acontece direto na hora do approve.
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('consumed', 'Consumed'),
        ('rejected', 'Rejected'),
    ]

    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='approvals')
    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='approvals')
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='approvals_requested')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approvals_reviewed')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    note = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['campaign', 'status'])]


# === DiceRig ===
class DiceRig(models.Model):
    DICE_CHOICES = [
        ('d4', 'd4'), ('d6', 'd6'), ('d8', 'd8'), ('d10', 'd10'),
        ('d12', 'd12'), ('d20', 'd20'), ('d100', 'd100'), ('any', 'any'),
    ]
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='dice_rigs')
    target_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='dice_rigs')
    dice_type = models.CharField(max_length=10, choices=DICE_CHOICES, default='d20')
    # values: [{value: int, consumed: bool, label?: str, consumed_at?: iso}]
    values = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        indexes = [models.Index(fields=['campaign', 'target_user'])]


# === DiceLog ===
class DiceLog(models.Model):
    campaign = models.ForeignKey(Campaign, on_delete=models.SET_NULL, null=True, blank=True, related_name='dice_logs')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='dice_logs')
    dice_type = models.CharField(max_length=10)
    result = models.IntegerField()
    rigged = models.BooleanField(default=False)
    label = models.CharField(max_length=120, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['campaign']), models.Index(fields=['user'])]


# === CombatInstance ===
# Uma campanha tem uma instância de combate ativa (ou nenhuma).
# combat_state guarda combatentes, mapa, posição do turno. Tudo em JSON pra
# simplicidade — a estrutura está documentada em api/combat.py.
class CombatInstance(models.Model):
    campaign = models.OneToOneField(Campaign, on_delete=models.CASCADE, related_name='combat')
    active = models.BooleanField(default=False)
    round_number = models.IntegerField(default=1)
    turn_index = models.IntegerField(default=0)
    # combatants: [combatant dict] - ver combat.py
    combatants = models.JSONField(default=list)
    # map: {background_image: '<base64>', grid_size_px: 50, grid_visible: true, width_px, height_px}
    map_data = models.JSONField(default=dict)
    # log de últimas N ações para mestre/telão
    action_log = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


# === RollRequest ===
# Jogador clica em rolar, cria uma request pendente. Mestre decide se torna
# pública (aparece no telão) ou privada (só ele e o jogador veem). Quando a
# decisão é tomada o backend rola de fato (consumindo dice rig se houver).
class RollRequest(models.Model):
    STATUS_CHOICES = [
        ('pending',  'Pending'),
        ('public',   'Resolved Public'),
        ('private',  'Resolved Private'),
        ('cancelled','Cancelled'),
    ]
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='roll_requests')
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='roll_requests')
    character = models.ForeignKey(Character, on_delete=models.SET_NULL, null=True, blank=True)
    label = models.CharField(max_length=120, blank=True, default='')
    dice_type = models.CharField(max_length=10, default='d20')
    count = models.IntegerField(default=1)
    modifier = models.IntegerField(default=0)
    has_advantage = models.BooleanField(default=False)
    has_disadvantage = models.BooleanField(default=False)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='pending')
    # Resultado preenchido após o mestre decidir e o servidor rolar.
    # rolls: [{value, kept}], total: int (rolagens + modifier)
    rolls = models.JSONField(default=list)
    total = models.IntegerField(null=True, blank=True)
    is_critical = models.BooleanField(default=False)        # nat 20 em pelo menos um d20
    is_critical_fail = models.BooleanField(default=False)   # nat 1 em pelo menos um d20
    rigged = models.BooleanField(default=False)              # veio de DiceRig
    note = models.CharField(max_length=200, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['campaign', 'status'])]


# === Catálogo de itens da campanha (homebrew / mágicos cadastrados pelo mestre) ===
class CampaignItem(models.Model):
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='items')
    data = models.JSONField(default=dict)  # mesmo formato de frontend/data/items.js
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return (self.data or {}).get('name', 'item')


# === Diário da campanha ===
# Linha do tempo da mesa: notas escritas (mestre/jogadores) e eventos
# registrados automaticamente (subida de nível, XP, item, descanso, combate,
# rolagens marcantes). Agrupado por sessão (campaign.state.session).
# Ver api/diary.py (log_diary) e views_diary.py.
class DiaryEntry(models.Model):
    KIND_CHOICES = [('note', 'Note'), ('event', 'Event')]
    SUBTYPES = ('note', 'session', 'roll', 'levelup', 'levelgrant', 'item', 'combat', 'rest', 'xp', 'reveal', 'custom')

    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='diary_entries')
    session = models.IntegerField(null=True, blank=True)  # nº da sessão; None = sem sessão (agrupa por dia)
    kind = models.CharField(max_length=10, choices=KIND_CHOICES, default='note')
    subtype = models.CharField(max_length=20, default='note')
    title = models.CharField(max_length=200, blank=True, default='')
    body = models.TextField(blank=True, default='')
    data = models.JSONField(default=dict, blank=True)
    occurred_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='diary_entries')
    hidden = models.BooleanField(default=False)  # oculto dos jogadores
    edited_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-occurred_at', '-id']
        indexes = [models.Index(fields=['campaign', 'session']), models.Index(fields=['campaign', '-occurred_at'])]

    def __str__(self):
        return self.title or self.subtype


# === Pedido de teste do mestre para a mesa ===
# "Todos: Percepção CD 15". Cada jogador-alvo responde rolando no app (servidor
# rola, respeitando DiceRig) ou digitando o dado físico. O mestre vê quem
# passou/falhou e decide se mostra no telão. Nada é aplicado na ficha.
class CheckRequest(models.Model):
    KIND_CHOICES = [('skill', 'Skill'), ('save', 'Save'), ('ability', 'Ability'), ('custom', 'Custom')]
    ADV_CHOICES = [('normal', 'Normal'), ('adv', 'Advantage'), ('dis', 'Disadvantage')]
    STATUS_CHOICES = [('open', 'Open'), ('closed', 'Closed')]

    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='check_requests')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='check_requests')
    label = models.CharField(max_length=120)
    kind = models.CharField(max_length=10, choices=KIND_CHOICES, default='skill')
    key = models.CharField(max_length=30, blank=True, default='')  # 'perception', 'dex', ...
    dc = models.IntegerField(null=True, blank=True)
    dc_hidden = models.BooleanField(default=False)  # jogadores não veem a CD
    advantage = models.CharField(max_length=6, choices=ADV_CHOICES, default='normal')
    target_user_ids = models.JSONField(default=list, blank=True)  # [] = todos os jogadores
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='open')
    show_on_screen = models.BooleanField(default=False)
    screen_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['campaign', 'status'])]

    def __str__(self):
        return self.label


class CheckResponse(models.Model):
    MODE_CHOICES = [('app', 'Rolled in app'), ('physical', 'Physical die'), ('dm', 'Entered by DM')]

    check_request = models.ForeignKey(CheckRequest, on_delete=models.CASCADE, related_name='responses')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='check_responses')
    character = models.ForeignKey(Character, on_delete=models.SET_NULL, null=True, blank=True)
    mode = models.CharField(max_length=10, choices=MODE_CHOICES, default='app')
    natural = models.IntegerField(null=True, blank=True)   # dado mantido (None se só o total foi informado)
    rolls = models.JSONField(default=list, blank=True)     # [{value, kept}] quando rolou no app
    modifier = models.IntegerField(null=True, blank=True)
    total = models.IntegerField()
    rigged = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        unique_together = [('check_request', 'user')]


# === Preparação do mestre: aventuras como mapa de nós (salas/cenas) ===
# Só o mestre lê/edita. `data` guarda a estrutura ({version, nodes, edges}) e
# `play` o estado na mesa ({current, visited, unlocked}) — separados para o
# autosave do editor nunca sobrescrever o que aconteceu no jogo.
# Validação/limites em api/views_adventures.py.
class Adventure(models.Model):
    STATUS_CHOICES = [('draft', 'Draft'), ('playing', 'Playing'), ('done', 'Done')]

    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='adventures')
    name = models.CharField(max_length=120)
    summary = models.TextField(blank=True, default='')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    data = models.JSONField(default=dict, blank=True)
    play = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [models.Index(fields=['campaign', '-updated_at'])]

    def __str__(self):
        return self.name


# === Link de compartilhamento de ficha ===
# Cópia da ficha guardada por 24h; o link leva só o token. Quem cria precisa de
# conta; quem abre não. Expirados são apagados ao criar novos (sem tarefa agendada).
def new_share_token():
    return secrets.token_urlsafe(9)  # 12 caracteres


class SharedCharacter(models.Model):
    token = models.CharField(max_length=24, unique=True, default=new_share_token)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='shared_characters')
    data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)

    def __str__(self):
        return f'{self.token} ({self.data.get("name", "")})'


# === Mundo da campanha ===
# Lugares, NPCs, facções, itens, lore e documentos que o mestre cria. Fica numa
# tabela própria (nunca em Campaign.state, que vaza para jogador e telão). O
# filtro do que o jogador vê é feito só no backend (api/world_rules.py).
class WorldEntry(models.Model):
    KIND_CHOICES = [('place', 'Place'), ('npc', 'NPC'), ('faction', 'Faction'),
                    ('item', 'Item'), ('lore', 'Lore'), ('handout', 'Handout')]
    VIS_CHOICES = [('hidden', 'Hidden'), ('partial', 'Partial'), ('revealed', 'Revealed')]

    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='world')
    kind = models.CharField(max_length=16, choices=KIND_CHOICES)
    name = models.CharField(max_length=120)
    summary = models.CharField(max_length=280, blank=True, default='')
    body = models.TextField(blank=True, default='')
    dm_notes = models.TextField(blank=True, default='')        # só mestre, nunca vai p/ jogador
    secrets = models.JSONField(default=list, blank=True)       # [{id, text, revealed}]
    visibility = models.CharField(max_length=10, choices=VIS_CHOICES, default='hidden')
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    tags = models.JSONField(default=list, blank=True)
    links = models.JSONField(default=list, blank=True)         # [{to, rel, note}]
    data = models.JSONField(default=dict, blank=True)          # campos por tipo (whitelist)
    when_label = models.CharField(max_length=60, blank=True, default='')
    when_order = models.IntegerField(null=True, blank=True)
    image_ver = models.CharField(max_length=16, blank=True, default='')
    sort = models.IntegerField(default=0)
    revealed_at = models.DateTimeField(null=True, blank=True)
    version = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort', 'id']
        indexes = [models.Index(fields=['campaign', 'kind']),
                   models.Index(fields=['campaign', 'visibility'])]

    def __str__(self):
        return self.name


class WorldImage(models.Model):
    # Blob separado para a lista nunca carregar imagem (e para migrar p/ R2 depois).
    entry = models.OneToOneField(WorldEntry, on_delete=models.CASCADE, related_name='img')
    data = models.TextField()  # data:image/(jpeg|png|webp);base64 ≤ 450k chars


# === Ecos da mesa (imersão do Mundo) ===
# Reações de personagem dos jogadores a cartões revelados/parciais e o registro
# de leitura. Só o mestre vê quem reagiu; o jogador vê só as próprias marcas e
# contagens agregadas (ver views_world.world_echoes / world_react / world_view).
class WorldReaction(models.Model):
    KIND_CHOICES = [('shiver', 'Shiver'), ('love', 'Love'), ('doubt', 'Doubt'),
                    ('fight', 'Fight'), ('star', 'Want to return')]

    entry = models.ForeignKey(WorldEntry, on_delete=models.CASCADE, related_name='reactions')
    membership = models.ForeignKey(Membership, on_delete=models.CASCADE, related_name='world_reactions')
    kind = models.CharField(max_length=10, choices=KIND_CHOICES)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['entry', 'membership', 'kind'],
                                               name='uniq_world_reaction')]
        indexes = [models.Index(fields=['membership'])]


class WorldView(models.Model):
    entry = models.ForeignKey(WorldEntry, on_delete=models.CASCADE, related_name='views')
    membership = models.ForeignKey(Membership, on_delete=models.CASCADE, related_name='world_views')
    count = models.PositiveIntegerField(default=0)
    last_at = models.DateTimeField()

    class Meta:
        constraints = [models.UniqueConstraint(fields=['entry', 'membership'], name='uniq_world_view')]
        indexes = [models.Index(fields=['membership'])]

# Backend: o que falta para as escolhas de talento (v1.0.94–v1.0.98)

O frontend já está pronto. Esta lista é o que o servidor precisa para acompanhar.
Tudo está em ordem de prioridade.

## 1. Recursos de talento (Sorte, Adepto Marcial, Adepto Metamágico)

**Hoje:** a ficha mostra os recursos com a chave `feat.<id-base>` (`feat.lucky`,
`feat.martialAdept`, `feat.metamagicAdept`). Fora de campanha já funcionam.
Numa campanha, `POST /api/characters/:id/resource` ignora a chave porque
`compute_resources` não a conhece. A ficha detecta a resposta inalterada e mostra
"aguardando atualização do servidor" no recurso.

**Dados:** `node scripts/sync-rules.mjs` já grava a tabela em
`backend/api/progression/catalog.json`, na chave `featResources`
(`{ "2014": { "lucky": {...} }, "2024": {...} }`). Ela vem de `FEAT_RESOURCES`
em `frontend/src/progression/resources.js`.

**Mudança em `backend/api/progression/resources.py`:** ler a tabela
(como `SPECIES_RESOURCES` em `rules.py`) e, em `compute_resources`, depois do
laço das espécies:

```python
by_feat = FEAT_RESOURCES.get(int(rules)) or FEAT_RESOURCES.get(rules) or {}
for f in character.get('feats') or []:
    base = str((f or {}).get('id') or '').removesuffix('2014')
    r = by_feat.get(base)
    key = f'feat.{base}'
    if r and not any(x['key'] == key for x in out):
        res = _build(character, 'feat', r, key, total)
        if res:
            out.append(res)
```

`rest_resources` já cobre o resto: o curto recupera o Adepto Marcial
(`recharge: 'short'`) e o longo zera tudo.

## 2. Troca de escolhas pela linha do tempo (respec)

**Hoje:** na linha do tempo, cada escolha feita tem um botão "Trocar": ASI/talento do
nível, opções de classe e escolhas da espécie. A ficha calcula a versão nova inteira.
Fora de campanha ela é salva direto. Numa campanha vira um pedido:
`POST /api/approvals/campaign/:id`, um por mesa do personagem, com este corpo:

```json
{ "type": "other", "characterId": 12,
  "payload": { "kind": "respec", "title": "Troca da escolha do nível 4",
               "changes": ["− Talento: Alerta", "+ Talento: Sortudo", "FOR 16 → 18"],
               "patch": { "abilities": {}, "feats": [], "levelChoices": {} } } }
```

O mestre já vê o pedido no painel de solicitações, com a lista de `changes`.
O jogador vê uma faixa "Troca aguardando o mestre" no topo da linha do tempo. Ela é lida de
`GET /api/approvals/campaign/:id` (pedidos `respec` em `pending` ou `approved`) e conferida
a cada 20 s. Quando o pedido vira `consumed`, a ficha é recarregada. Por isso,
ao aplicar o `patch`, o servidor deve marcar o pedido como `consumed`, como já faz com
os outros tipos em `approval_review`.
Falta o servidor aplicar o `patch` ao aprovar. Em
`apply_approval_to_character` (`backend/api/progression/engine.py`):

```python
RESPEC_FIELDS = ('abilities', 'feats', 'levelChoices', 'classOptions', 'speciesChoices',
                 'raceBonus', 'spells', 'skillProfs', 'skillExpertise')
if approval_type == 'other' and payload.get('kind') == 'respec':
    patch = payload.get('patch') or {}
    for k in RESPEC_FIELDS:
        if k in patch:
            nxt[k] = patch[k]
    return apply_autos(nxt)
```

Vale validar antes (ex.: `validate_level_choice` para cada `levelChoices` alterado), mas
o mestre já revisa o pedido. A lista de campos é a mesma de `RESPEC_FIELDS` em
`frontend/src/progression/respec.js`.

## 2b. Pulso: campos novos sem fonte de rev

`api.tests.test_pulse` falha em 2 testes. `myMembership`, `myMemberships` e,
para o jogador, `inviteCode` saem no GET da campanha, mas o `/pulse` não
tem rev para eles. Uma vaga nova não atualiza as outras telas até recarregar.

## 3. Código de convite visível para jogadores

`CampaignListSerializer` manda `inviteCode` a todos.
`frontend/src/sheet/CampaignLinkModal.jsx` usa isso para ligar mais um
personagem à mesa. Três testes (`test_api`, `test_state_patch`) esperam que só o
mestre veja. Há dois caminhos:

- manter e atualizar os testes;
- esconder e aceitar `campaignId` sem código em `POST /api/campaigns/join` quando
  o usuário já tem vaga na mesa.

## 4. Testes da regra antiga de "uma campanha por ficha"

`test_campaign_link` e `test_modes` (10 testes) esperam a regra antiga.
Personagem em várias mesas agora é o comportamento desejado.

## Sem ação no servidor

Estas mudanças são só de exibição ou já passam pelos campos existentes da ficha:

- Texto oficial do SRD em classes e talentos (v1.0.94, v1.0.96).
- Opções de classe escolhidas por talento: estilo de luta, maestria, invocação,
  armas e resistências (v1.0.97).
- Resistências na lista de proficiências (v1.0.98).

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

## 2. Pulso: campos novos sem fonte de rev

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

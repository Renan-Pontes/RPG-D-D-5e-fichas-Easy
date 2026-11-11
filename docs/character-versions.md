# Versões da ficha por campanha

Cada personagem tem um **modelo** (a ficha fora de campanha) e uma **versão** por
campanha: uma cópia completa e independente da ficha. Trocar de campanha troca a ficha
inteira; sair guarda a versão; só o dono pode excluí-la.

Este documento diz o que o frontend já faz (v1.0.54) e o que o backend precisa passar a
fazer para o modelo ficar completo. Onde isto entra no plano geral:
[`sync-spec.md`](sync-spec.md) bloco D1; decisão registrada em `ADR.md` ADR-0034.

## 1. Regras

| Ação | Quem | Estado | O que acontece |
|---|---|---|---|
| Adicionar a uma campanha | dono | nenhum → `active` | copia o modelo daquele momento |
| Sair | dono | `active` → `left` | a versão fica guardada, intacta |
| Voltar | dono | `left` → `active` | reusa a MESMA versão (não recopia o modelo) |
| Tirar da mesa | mestre | `active` → `left` | igual a sair; o mestre nunca apaga uma versão |
| Excluir | só o dono | `left`/`archived` → apagada | apaga a versão para sempre; exige sair antes |
| Promover a modelo | dono | qualquer versão | o modelo vira cópia da versão (um "desfazer") |
| Campanha encerrada ou apagada | sistema | → `archived` | a versão fica só para leitura, para sempre |

- Não há campos compartilhados: cada versão é uma cópia completa.
- Versões `left` e `archived` são só leitura: sem edição, descanso, PV, espaços de
  magia, inventário, subida de nível, combate, pedidos de rolagem ou testes. Os dados
  rolam só no aparelho. Exportar continua valendo.
- Apagar o personagem apaga todas as versões.

## 2. O que o frontend faz hoje (armazenamento de transição)

O servidor ainda guarda UMA ficha por personagem e tranca campos de quem está em
campanha (`OWNER_LOCKED_IN_CAMPAIGN`). Por isso:

- A ficha do servidor (`Character.data`) é a **cópia de trabalho** da versão em uso.
- As outras versões ficam dentro dela, em `data.versions`:

```json
{
  "current": "template | <campaignId>",
  "template":     { "data": { "...": "ficha completa" }, "savedAt": "ISO" },
  "templatePrev": { "data": { }, "savedAt": "ISO" },
  "campaigns": {
    "<campaignId>": { "name": "…", "state": "active|left|archived", "data": { }, "savedAt": "ISO", "leftAt": "ISO" }
  }
}
```

- `template` é `null` enquanto o modelo é a cópia de trabalho; a versão em uso tem
  `data: null` (os dados dela são a própria ficha).
- Retrato igual ao da cópia de trabalho não é duplicado: a cópia guarda
  `_avatarSame: true` no lugar de `avatar`.
- Trocar de versão é sempre: **soltar a ficha da mesa atual** (`PUT members/<id>`
  com `characterId: null`) → **gravar a outra versão** (`PUT /characters/<id>`) →
  **sentar na mesa nova** (`PUT members/<id>` ou `POST /campaigns/join`).
- Ao abrir a ficha, o frontend acerta o armazém com `GET /characters/<id>/campaigns`:
  ficha atrelada por fora vira versão em uso; ficha que saiu vira `left`; campanha
  encerrada ou que sumiu de `GET /campaigns` vira `archived`.

Código: `frontend/src/sheet/versions.js` (regras, com testes),
`frontend/src/sheet/VersionsModal.jsx` (tela e chamadas).

### Limites desta fase

- O personagem só está "sentado" em UMA campanha por vez: nas outras, a vaga da pessoa
  fica sem personagem, e o mestre de lá não vê nem altera aquela versão.
- As versões guardadas pesam no JSON da ficha.
- Só leitura é garantido só na tela: o servidor não sabe o que é `left`/`archived`.

## 3. O que o backend precisa mudar

### Tabela

`CharacterVersion`: `character` (FK), `campaign` (FK, `SET_NULL`), `campaign_name`
(guardado para o arquivo), `data` (JSON), `state` (`active|left|archived`),
`left_at`, `created_at`, `updated_at`. Única por (`character`, `campaign`).
`Character.data` passa a ser só o modelo. `Membership.character` passa a apontar para
a versão (`Membership.version`).

### Rotas

| Rota | O que faz |
|---|---|
| `GET /characters/<id>/versions` | lista: estado, nome da campanha, prévia (nível, PV) |
| `POST /characters/<id>/versions` `{campaignId}` | entra: copia o modelo; passa pela aprovação do mestre, se houver |
| `GET /characters/<id>/versions/<campaignId>` | a ficha daquela versão |
| `PUT /characters/<id>/versions/<campaignId>` | grava a versão (mesmas travas de hoje para quem está em campanha) |
| `PATCH …/versions/<campaignId>` `{state}` | sair (`left`) ou voltar (`active`) |
| `DELETE …/versions/<campaignId>` | excluir: só o dono; 409 se `active` |
| `POST …/versions/<campaignId>/promote` | promover a modelo; guarda o modelo anterior |
| `POST /characters/<id>/template/undo-promote` | desfaz a última promoção |

### Regras no servidor

- Escrita em versão `left` ou `archived`: 423.
- Excluir e promover: só o dono (nem o mestre, nem admin pela tela).
- Encerrar ou apagar campanha: as versões viram `archived` (nunca apagar em cascata).
- Tudo o que hoje lê `Membership.character.data` passa a ler a versão: combate,
  pedidos de rolagem, testes, aprovações, o cartão de NPC no Mundo, a Tela, o painel
  do mestre, conjurar/descansar/inventário.
- Uma ficha pode estar `active` em várias campanhas ao mesmo tempo. No `main` a regra
  "uma campanha por vez" já caiu (commits de 09/11, ADR-0030/0031); a produção ainda a
  aplica, e 9 testes antigos ainda a esperam (`sync-spec.md` C2 e C3).

### Migração

1. Para cada `Membership` com personagem: cria a versão `active` com cópia de
   `Character.data` (sem a chave `versions`).
2. Para cada `Character.data.versions` (armazenamento de transição):
   - `campaigns[id].data` não nulo → versão com esse `data` e o `state` guardado;
   - `current` de campanha → a versão dela recebe o `Character.data` atual, e
     `Character.data` volta a ser `template.data`;
   - `_avatarSame: true` → troca pelo `avatar` da ficha;
   - `templatePrev` → campo próprio para o "desfazer".
3. Remove `versions` de `Character.data`.

Quando as rotas existirem, o frontend troca só as chamadas de `VersionsModal.jsx` e o
`reconcile` de `versions.js`; a tela e as regras ficam.

## 7. Cobertura do objetivo e divisão frontend × backend (11/11, v1.0.58)

**Objetivo**: a mesma ficha em várias campanhas ao mesmo tempo (nunca duas vezes na mesma),
cada campanha com a sua versão do modelo; o jogador pode ter várias fichas e NPCs na mesa,
trocar entre elas e levar a ficha para um *one-shot* paralelo.

### 7.1 O que o código cobre hoje

| Capacidade | Hoje | Onde |
|---|---|---|
| Modelo + uma versão por campanha | ✅ só no frontend | `frontend/src/sheet/versions.js` (`data.versions`) |
| Sair, voltar, arquivar, excluir, promover a modelo | ✅ frontend (excluir e promover sem teste no navegador) | `frontend/src/sheet/VersionsModal.jsx` |
| A mesma ficha em **duas mesas ao mesmo tempo** | ❌ | `VersionsModal.jsx` (`detach`) tira a ficha da mesa atual antes de abrir outra versão: o servidor guarda **uma** ficha |
| Nunca duas vezes na mesma mesa | ⚠️ só na view (409 `character_already_in_campaign`), sem regra no banco | `backend/api/views_campaigns.py::campaign_join`, `campaign_member` |
| Várias fichas do mesmo jogador na mesma mesa | ⚠️ backend do `main` (migração `0014`), **fora de produção**, sem tela | — |
| NPCs do mestre na mesa (`isNpc`) | ⚠️ backend do `main`, fora de produção; só `frontend/src/group/PlayersPanel.jsx` lê | `views_campaigns.py::campaign_join` |
| *One-shot* com a mesma ficha | ⚠️ só saindo da campanha principal | — |
| Só leitura das versões arquivadas | ⚠️ só na tela | `Sheet.jsx` (`data-version-hide`) |

### 7.2 Frontend — o que dá para fazer sem esperar o backend

A peça que destrava "várias mesas ao mesmo tempo" sem backend novo: **cada versão de campanha
vira uma ficha própria no servidor** (`POST /characters`), ligada ao modelo por
`data.versionOf = <id do modelo>`. Cada mesa aponta para a sua ficha; combate, dados, descanso
e a TV já funcionam por ficha, então nada no servidor precisa saber de versões.
Custo: cada versão conta no limite de fichas do plano (grátis = 3; a vaga patrocinada da mesa
cobre o excedente, `plans.py::decide_sponsored`), e o modelo e as versões não se sincronizam
sozinhos — o que é a regra "cópia completa" já combinada.

| # | Item | Arquivos | Depende de |
|---|---|---|---|
| F1 | `versions.js`: novo modo "versão = ficha" — `fork(template, campaign)` monta a cópia (sem `id`, com `versionOf`, `versionCampaign`, `_avatarSame`), `versionsOf(list, templateId)` agrupa por modelo; puro, com testes | `frontend/src/sheet/versions.js`, `frontend/tests/versions.test.js` | — |
| F2 | Entrar numa mesa com uma ficha que já está em outra: oferecer **"Nova versão para esta mesa"** (cria a cópia e entra com ela) em vez de soltar a outra | `VersionsModal.jsx`, `frontend/src/sheet/CampaignLinkModal.jsx`, `frontend/src/sheet/campaign-link.js` | F1 |
| F3 | Lista de fichas: as versões aparecem **dentro** do card do modelo (selo com o nome da mesa), não como fichas soltas | `frontend/app.jsx` (lista de fichas) | F1 |
| F4 | Trocar de versão = abrir a outra ficha (`#ficha=<id>`), sem `detach`/`save`/`attach`; o chip de versão do herói lista as irmãs | `Sheet.jsx` (`versionChip`), `app.jsx` | F1 |
| F5 | Migrar quem já tem `data.versions`: ao abrir, cada versão guardada vira uma ficha `versionOf` (uma vez, com confirmação); `data.versions` fica só como leitura até o backend chegar | `versions.js` (`unpack`), `Sheet.jsx` | F1 |
| F6 | **One-shot**: "Jogar um one-shot" no modelo cria a versão com `versionKind: 'oneshot'`; ao encerrar a campanha, ela vira arquivo (só leitura) | `versions.js`, `VersionsModal.jsx` | F1 |
| F7 | Escolher **qual das minhas fichas** senta à mesa (e trocar) — tela no convite e no painel do grupo | `CampaignLinkModal.jsx`, `frontend/src/group/PlayersPanel.jsx` | deploy do `main` (B) |
| F8 | Mestre adiciona NPC à mesa (`isNpc`) a partir das fichas dele | `frontend/src/group/PlayersPanel.jsx`, `frontend/src/group/group-api.js` | deploy do `main` (B) |
| F9 | Barrar no cliente a mesma ficha (ou duas versões do mesmo modelo, se for a regra) duas vezes na mesma mesa, com a mensagem do 409 | `campaign-link.js`, `frontend/src/api/errors.js` | — |
| F10 | Limite do plano: antes de criar a versão, mostrar quantas fichas sobram e se a mesa patrocina; tratar 402 `plan_limit` | `CampaignLinkModal.jsx`, `errors.js` | F1 |
| F11 | Testes no navegador de excluir, promover/desfazer e adicionar a uma campanha (faltaram na v1.0.54) | Playwright | — |
| F12 | Excluir o **modelo**: perguntar o destino das versões (ficam como fichas soltas, ou vão junto); excluir uma versão tira ela da lista do modelo | `frontend/app.jsx` (`handleDelete`) | F1 |
| F13 | Preferências por aparelho seguem a cópia: `fh-belt:<id>` e `fh-multiroll4:<id>` são copiados para o id novo ao criar a versão | `frontend/components/Sheet.jsx` (`BeltAbilities`), `frontend/src/dice/MultiRoll.jsx` | F1 |
| F14 | Evolução no modelo não chega às versões (cópia completa): ação opcional **"Recomeçar a partir do modelo"** numa versão sem sessão jogada, com confirmação digitada | `VersionsModal.jsx`, `versions.js` | F1 |
| F15 | NPC do mestre como versão: o cartão do Mundo aponta para a ficha da versão (`ficha:<id da versão>`), não para o modelo | `frontend/src/sheet/npc-link.js` | F1, F8 |
| F16 | Plano: o contador e o `LimitDialog` mostram versões agrupadas ("3 fichas · 2 são versões de Arwen"), para o jogador entender o que gasta a cota | `frontend/src/plans/plans-logic.js`, `frontend/src/plans/LimitDialog.jsx` | F1 |
| F17 | Aposentar a prévia `v:<id>:<chave>` e o hash `#ficha=<id>@<chave>` depois do F5: links antigos abrem a ficha da versão | `versions.js` (`previewChar`, `parseSheetHash`), `app.jsx` (`versionPreview`) | F5 |
| F18 | Modo offline (`localStorage`, sem login): criar versão funciona igual, com id local; a migração para a conta leva o `versionOf` junto | `frontend/src/api/storage.js` | F1 |
| F19 | Textos pt/en das telas novas (selo de versão, "Nova versão para esta mesa", one-shot, destino ao excluir) | `frontend/data/i18n.js` | F2–F16 |

**Varredura de impacto (o que a "versão = ficha" NÃO muda)**: combate (`frontend/src/campaigns/CombatActionPanel.jsx` lê `characterCampaigns` por id), dados e TV (por id de ficha), subida de nível e aprovações (`frontend/src/progression/`, `frontend/src/group/RequestsPanel.jsx` — por ficha), exportação em PDF (da ficha aberta). Como cada versão é uma ficha comum, esses caminhos funcionam sem alteração.

### 7.2.1 Entregue na v1.0.60 (sem backend novo)

| Item | Estado | Onde |
|---|---|---|
| F1 | ✅ modelo puro + 10 testes | `frontend/src/sheet/forks.js`, `frontend/tests/forks.test.js` |
| F2 | ✅ "Nova versão para outra mesa" cria a ficha (`POST /characters`) e abre o seletor de mesa nela | `VersionsModal.jsx` (seção "Mesas ao mesmo tempo"), `frontend/app.jsx` (`handleFork`) |
| F3 | ✅ versões logo abaixo do modelo, recuadas, com selo da mesa | `frontend/components/CharacterList.jsx`, `frontend/src/home/HeroCard.jsx`, `frontend/src/home/home.css` |
| F4 | ✅ chip da versão no herói; a lista "Mesas ao mesmo tempo" abre o modelo e as irmãs | `components/Sheet.jsx`, `VersionsModal.jsx` |
| F6 | ⚠️ parcial: "Jogar um one-shot" cria a versão `oneshot`; arquivar ao encerrar a campanha ainda não | idem F2 |
| F9 | ✅ mesa onde outra versão da mesma ficha já senta fica bloqueada ("Outra versão desta ficha já joga aqui") | `frontend/src/sheet/campaign-link.js` (`seatState` → `family`), `CampaignLinkModal.jsx` |
| F12 | ⚠️ parcial: excluir o modelo avisa quantas versões há e elas ficam como fichas soltas; sem escolha de levar junto | `app.jsx` (`handleDelete`) |
| F13 | ✅ cinto e rolador múltiplo copiados para a ficha nova | `forks.js` (`copyDevicePrefs`) |
| — | a versão grava em qual mesa sentou (`versionCampaign`), campo que a produção aceita em campanha | `Sheet.jsx` (efeito de `characterCampaigns`) |

Pendentes no frontend: F5, F6 (arquivar), F10, F11, F12 (levar junto), F14, F16–F19. F7, F8 e F15 esperam o B1.
Testado no navegador (390×844) contra o servidor local: criar versão, seletor aberto na ficha nova, mesa da mesma família bloqueada, abrir o modelo pela lista, lista inicial agrupada; sem erros no console. Com o plano no limite, a criação mostra o aviso do plano e não navega.

### 7.3 Backend — só o que o frontend não consegue fazer

| # | Item | Por que não dá no frontend |
|---|---|---|
| B1 | **Deploy do `main`** (segredo `FORJA_UPDATE_KEY_SHA256` ou atualização manual do Renan) | sem ele produção não tem `0014` (várias fichas por jogador, NPC) — trava F7 e F8 |
| B2 | Decidir a regra da Task 1.2 (opção A: N mesas, nunca duas vezes na mesma) e reescrever os 9 testes | os testes e as views são do servidor |
| B3 | `UniqueConstraint(campaign, character)` condicional + migração `0016` | corrida de duas requisições só se fecha no banco |
| B4 | Só leitura no servidor: `PUT /characters/:id` responde `423` para versão arquivada | o cliente pode ser contornado |
| B5 | Campo `version_of` (FK opcional para o modelo) e `version_kind` em `Character`, com índice | `data.versionOf` funciona, mas consulta e integridade (apagar o modelo) pedem coluna |
| B6 | Limite do plano: versões do mesmo modelo contam como **uma** ficha (ou regra própria) | a cota é calculada em `plans.py` |
| B7 | Retrato compartilhado: `/characters/:id/avatar` lê do modelo quando a versão tem `_avatarSame` | evita copiar 1–2 MB de imagem por versão (hoje é cópia) |
| B8 | (Opcional, depois) `CharacterVersion` + `resolve_sheet_target` do §3 — só se a "versão = ficha" do §7.2 não bastar | o §7.2 cobre o objetivo sem isso |

Com F1–F6 + F9–F19 o objetivo funciona **já, no backend de produção**; B1 libera F7–F8;
B2–B7 tornam as regras garantidas pelo servidor em vez de só pela tela.

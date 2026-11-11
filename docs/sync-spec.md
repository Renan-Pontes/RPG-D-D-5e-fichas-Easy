# Especificação de sincronia: frontend × backend × produção

> Estado em 11/11/2026, `main` em `2c458f6`. Este é o documento de entrada. Os detalhes
> ficam em: [`sync-ledger.md`](sync-ledger.md) (todas as rotas e todos os commits),
> [`character-versions.md`](character-versions.md) (versões da ficha),
> [`../API.md`](../API.md) (contratos), [`../DEPLOY.md`](../DEPLOY.md) §7 (atualização
> automática) e [`../ADR.md`](../ADR.md) ADR-0032 a 0035 (decisões).

## 1. Resumo

- A produção roda o backend de **26/10/2026** (`5655785`), embora `/api/ops/version`
  diga `fcaa730` (16/10). O frontend em produção é sempre o `main` (Vercel).
- Desde então o `main` tem **328 commits**: 266 só de frontend, 31 só de backend, 30
  nos dois, 1 só de documentação. No backend: 29 arquivos de código (+6.783 linhas),
  26 de teste (+4.958), **26 rotas novas** e a migração `0014`.
- O que falta para alinhar tudo cabe em quatro blocos: **A** destravar o deploy,
  **B** conferir o que já está escrito, **C** consertar o `main` antes de subir,
  **D** escrever o que só o frontend tem.

## 2. Como a base foi medida

| Evidência | Resultado |
|---|---|
| `GET /api/ops/version` em produção | `fcaa730`, 16/10 |
| `characters/<id>/inventory/open-pack` (commit de 24/10) | existe em produção (403 sem login) |
| 13 rotas criadas de 27/10 em diante (pulse, stage, table-roll, undo, ingest…) | 404 em produção; 403/400 no `main` local |
| Último commit de backend antes da primeira rota ausente | `5655785` (26/10) |

Conclusão: o rótulo de versão está velho (o atualizador provavelmente usou o zip do
código, que não traz `VERSION.json` novo). A base real é `5655785`.

## 3. Bloco A: destravar o deploy (dono do repositório)

| # | Item | Pronto quando |
|---|---|---|
| A1 | Criar o secret `FORJA_UPDATE_KEY_SHA256` (sha256 em hex da senha de atualização) | o passo "Atualiza o servidor" do workflow roda |
| A2 | Se `~/forja-data/update-key` não existir no servidor: `manage.py chave_atualizacao` | `POST /api/ops/status` responde 200 com a senha |
| A3 | Disparar uma atualização (push ou `POST /api/ops/update`) | `/api/ops/version` mostra o commit do `main` |
| A4 | Fazer o atualizador gravar `VERSION.json` também quando cai no zip do código | a versão nunca mais fica velha |

## 4. Bloco B: já escrito, entra com o deploy

Conferir cada item depois da atualização. Rotas exatas e chamadores em
[`sync-ledger.md`](sync-ledger.md) §1.

| # | Área | Backend | Frontend que depende | Sem o deploy, hoje |
|---|---|---|---|---|
| B1 | Vagas | migração `0014`: vaga de NPC e várias fichas por pessoa na mesma campanha | `sheet/CampaignLinkModal.jsx`, `group/PlayersPanel.jsx` | segunda ficha na mesma mesa é recusada |
| B2 | Pulso | `campaigns/<id>/pulse` (ETag/304, projeção do jogador) | `api/polling.js`, `play/table-store.js`, `player/` | cai no GET completo a cada ciclo |
| B3 | Palco da TV | `stage`, `stage/scene`, `stage-image`, `screen/<token>/stage-image` | `stage/`, `screen/TVScreen.jsx`, `play/scene-actions.js` | palco montado no cliente (caminho "servidor antigo") |
| B4 | Combate | `encounter`, `prev-turn`, `undo`, `save-preview`, `map-from`, `map-image`, `token/<id>`, `actions/<ref>` | `campaigns/CombatTab.jsx`, `play/combat-actions.js`, `combat/encounter-setup.js` | sem desfazer, sem voltar turno, montagem em várias chamadas |
| B5 | Rolagens na Tela | `characters/<id>/table-roll`; `screen/<token>/rolls` sai | `dice/`, `shell/AdvancedDice.jsx` | rolagem da ficha não entra na fila da TV |
| B6 | Retratos e fichas na TV | `screen/<token>/portrait/<id>`, `token/<id>`, `members/<id>/avatar` | `screen/`, `group/` | imagens em base64 no payload |
| B7 | Diário e plano | `diary/sessions/<n>/end`, `session-plan/archive`, `restore` | `campaigns/DiaryTab.jsx`, `prep/` | encerrar em várias chamadas |
| B8 | Aventuras | `adventures/<id>/nodes`, `node/<id>` | `prep/SceneSheet.jsx`, `prep/prep-api.js` | aventura inteira a cada leitura |
| B9 | Raio-X | `party-insights`, `party-insights/history` | `group/` | painel sem os ajustes do grupo |
| B10 | Mundo | `world/ingest`; imagem até 5 M caracteres ou link http(s); zonas no mapa; `contains`; fontes | `world/EntryEditor.jsx`, `WorldMap.jsx`, `image.js` | ingestão 404; link de imagem e imagem grande recusados; zonas descartadas ao salvar |
| B11 | NPC do mestre | `_sync_char_to_world_npc` sem quebrar em ficha sem classe | `sheet/npc-link.js` (já usa a API do Mundo como contorno) | contorno no cliente |
| B12 | Magia | espaços de pacto de multiclasse voltam no descanso curto (`spells.py`) | `components/SheetTabs.jsx` | o cliente devolve fora de campanha; em campanha não |
| B13 | Importação | `proxy` (monstros e imagens de fora) | `combat/`, `world/image.js` | cascata de proxies públicos |
| B14 | Ficha em campanha | `campaignIds` e `tableSlot` na ficha; `sheetRolls`, `live` e `sheetRollsMode` em `characters/<id>/campaigns` (o que a ficha manda à Tela: Todas / Só 20 e 1) | `components/Sheet.jsx`, `dice/` | a ficha não sabe a política da mesa e rola só no aparelho |

Depois do deploy: remover os caminhos "servidor antigo" (35 trechos em 22 arquivos;
`grep -rn "servidor antigo" frontend/src`).

## 5. Bloco C: consertar no `main` antes de subir

Suíte do backend no `main`: 1.005 testes, **13 falhas e 2 erros**.

| # | Item | Arquivo | Detalhe |
|---|---|---|---|
| C1 | Migração que falta | `backend/api/migrations/` | `makemigrations --check` pede a `0015` (remove `api_members_user_id_idx`, renomeia `api_members_camp_char_idx`) |
| C2 | Decidir "uma campanha por vez" | `views_campaigns.py` | os commits de 09/11 liberaram N campanhas por ficha; 9 testes ainda esperam o 409. As versões da ficha (bloco D) pedem N campanhas |
| C3 | Atualizar os testes da regra antiga | `test_campaign_link.py` (`OneCampaignAtATimeTests`: 5), `test_modes.py` (`SingleCampaignTests`: 2) | seguem a decisão de C2 |
| C4 | 2 erros | `test_campaign_link.py` | `test_can_move_out_of_closed_campaign`, `test_dm_cannot_attach_self_as_player` |
| C5 | Vaga na listagem e permissão | `test_campaign_link.py` | `test_campaign_list_brings_my_seat`, `test_dm_of_one_table_cannot_pull_sheet_from_another` |
| C6 | Pulso sem fonte de revisão | `test_pulse.py` | um campo do mestre e um do jogador entraram sem `rev` (2 testes) |
| C7 | Ajustes do mestre | `test_state_patch.py` | `test_dm_settings_only_for_dm` |
| C8 | Segredos para o jogador | `test_api.py` | `test_player_can_read_campaign_but_no_secrets`: conferir primeiro, é privacidade |
| C9 | Testes no release | `.github/workflows/backend-release.yml` | rodar `manage.py test` antes de empacotar |

## 6. Bloco D: o frontend já tem, o backend ainda não

### D1. Versões da ficha (frontend v1.0.54)

Especificação completa em [`character-versions.md`](character-versions.md). Itens:

| # | Item |
|---|---|
| D1.1 | Tabela `CharacterVersion` e migração |
| D1.2 | `Membership` aponta para a versão |
| D1.3 | `GET /characters/<id>/versions` |
| D1.4 | `POST /characters/<id>/versions` (entra copiando o modelo) |
| D1.5 | `GET` e `PUT …/versions/<campanha>` |
| D1.6 | `PATCH …/versions/<campanha>` (sair, voltar) |
| D1.7 | `DELETE …/versions/<campanha>` (só o dono; 409 se ativa) |
| D1.8 | `POST …/promote` e desfazer |
| D1.9 | 423 em escrita de versão `left` ou `archived` |
| D1.10 | Encerrar ou apagar campanha arquiva as versões |
| D1.11 | Combate, pedidos, testes, aprovações, NPC, Tela e painel do mestre leem a versão |
| D1.12 | Migração de dados: vagas → versões; desempacotar `data.versions` |
| D1.13 | Testes de cada regra |
| D1.14 | Frontend: trocar as chamadas de `sheet/VersionsModal.jsx` e o `reconcile` de `sheet/versions.js` |

### D2. Dados (frontend v1.0.37 a v1.0.51)

| # | Item | Hoje no frontend |
|---|---|---|
| D2.1 | `table-roll` aceitar resultado composto: vários grupos de dados, cada um com total, e o dano extra do crítico | `dice/MultiRoll.jsx` e `dice/BeltMultiRoll.jsx` rolam só no aparelho |
| D2.2 | Registrar essas rolagens no histórico (`DiceLog`) e no Diário | não registram |
| D2.3 | Dado preparado pelo mestre (`DiceRig`) valer nas rolagens compostas | sorteio só no cliente |
| D2.4 | Guardar o cinto por personagem (4 dados, atributo, BP, vantagem, cargas I/II) | `localStorage` `fh-belt:<id>` |
| D2.5 | Guardar as linhas do multi-rolagem por personagem | `localStorage` `fh-multiroll4:<id>` |

### D3. Depois de D1

| # | Item |
|---|---|
| D3.1 | O mestre vê a versão do jogador na campanha dele |
| D3.2 | Aposentar o armazenamento de transição (`data.versions`) |

## 7. O que mudou no frontend desde a base (para conferência)

Contagem de commits por pasta em [`sync-ledger.md`](sync-ledger.md) §2. Os que não
pedem nada do backend não aparecem nos blocos acima.

| Pasta | Commits | Pede backend? |
|---|---|---|
| `dice/` (rolador, multi-rolagem, cinto em pares) | 44 | D2 |
| `group/`, `campaigns/`, `play/`, `prep/`, `stage/`, `screen/`, `player/`, `checks/` (área do mestre v2) | ~150 | B2 a B9 |
| `world/` | 24 | B10, B11 |
| `components/Sheet*.jsx`, `sheet/` (herói, magias, perícias, cinto, versões) | ~30 | B1, B12, B14, D1, D2.4 |
| `shell/`, `api/` | 20 | B2, B5 |

Só de tela, sem contrato novo: layout do herói, matriz de espaços de magia, texto do
SRD nas magias, concessões de 40+ espécies (dados em `data/species-2024.js`), recursos
agrupados por descanso, linhas zebradas, cunhas de BP e cargas do cinto, animações do
rolador.

## 8. Como regenerar o livro-razão

`docs/sync-ledger.md` sai de `git log --no-merges 5655785..HEAD --name-only` (commits)
e de `backend/api/urls.py` cruzado com as chamadas `/api/…` do frontend (rotas). Ao
subir o backend, trocar a base pelo commit que entrou em produção e gerar de novo.

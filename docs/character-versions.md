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

# Decisões de arquitetura — Forja de Heróis v2

> Documento escrito durante a sessão noturna em que o backend, campanhas, telão e engine de progressão foram introduzidos. Lê isto primeiro de manhã.

## Contexto inicial

Antes desta sessão o projeto era um SPA Vite + React 18 puro, sem backend. Personagens salvos em `localStorage` (`dnd5e-forge:characters:v1`). O SRD em `data/srd.js` já estava bem completo (12 classes, ~25 raças, ~100 magias, ~50 bestas, várias subclasses).

Quatro frentes pedidas:

1. Backend com contas e personagens salvos na conta.
2. Campanhas com mestre, jogadores, aprovação de evoluções.
3. Telão (TV view) com status da campanha.
4. Engine que aplica automaticamente ganhos não-escolha (nível, subclasse).

Bônus mencionado: o mestre poder "controlar" os dados dos jogadores (injetar valores antes da rolagem).

## Escolha de stack — e por quê

| Camada | Escolha | Alternativa descartada | Motivo |
|---|---|---|---|
| Backend | **Node + Express + Prisma + SQLite + JWT + Socket.io** | Next.js API routes, Supabase | O frontend é Vite puro, não Next. Migrar pra Next.js seria reescrever o app. Supabase economizaria auth mas adiciona dependência externa, conta paga em produção, e o Renan já tem hospedagem Vercel funcionando — manter controle total faz mais sentido. SQLite em dev (zero setup), Postgres em prod via `DATABASE_URL`. |
| Auth | JWT em cookie httpOnly + bcrypt | OAuth (Google/Discord) | OAuth precisa de credenciais que só o Renan pode gerar. Cookie httpOnly é seguro contra XSS, o suficiente pra um app pequeno. Pode-se adicionar OAuth depois sem quebrar. |
| Realtime | Socket.io | SSE, polling | Telão precisa baixa latência (HP atualiza). Dice rigging precisa de canal bidirecional (mestre envia → jogador recebe). Socket.io abstrai reconexão e fallback. |
| Frontend integração | Adapter `storage.js` com `mode: 'local' \| 'remote'` | Reescrever tudo pra falar com API direto | Mantém compatibilidade com uso offline e usuários deslogados. Se logado, sincroniza com servidor. |

## Estrutura do repositório

```
/                    ← frontend Vite (mantido, sem mover)
  app.jsx, components/, data/, ...
  src/api/           ← NOVO: cliente HTTP + socket, adapter de storage
  src/auth/          ← NOVO: AuthContext + páginas
  src/campaigns/     ← NOVO: telas de campanha
  src/screen/        ← NOVO: telão público
  src/progression/   ← NOVO: engine de progressão automática (puro JS, testável)

/server              ← NOVO: backend
  prisma/schema.prisma
  src/
    index.js         ← bootstrap Express + Socket.io
    auth.js          ← /api/auth/*
    characters.js    ← /api/characters/*
    campaigns.js     ← /api/campaigns/*
    approvals.js     ← /api/approvals/*
    dice.js          ← /api/dice/* + socket events
    screen.js        ← /api/screen/:token (público)
    middleware.js    ← requireAuth, requireDM, ...
    progression/     ← cópia/import do engine compartilhado
  tests/             ← node:test
```

## Modelo de dados (resumo)

- **User**: `id, email (unique), passwordHash, displayName, createdAt`
- **Character**: `id, ownerId → User, data (JSON com a ficha inteira), campaignId? → Campaign, createdAt, updatedAt`
  - A ficha continua sendo um objeto JSON. Não vou normalizar `weapons`, `spells`, etc. pra tabelas — atrasa muito e o frontend já sabe lidar com o objeto. Migração futura é trivial se necessário.
- **Campaign**: `id, dmId → User, name, slug (unique), screenToken (unique), createdAt`
- **Membership**: `id, campaignId, userId, characterId?, role ('player'|'dm'), joinedAt` — `unique(campaignId, userId)`
- **Approval**: `id, campaignId, characterId, requestedBy, type ('levelup'|'feature'|'item'), payload (JSON), status ('pending'|'approved'|'rejected'), reviewedBy?, reviewedAt?, createdAt`
- **DiceRig**: `id, campaignId, targetUserId, label?, values (JSON: [int...]), createdAt, consumedAt?`
  - Fila de valores pré-determinados que o jogador "rolará". Quando o jogador clica rolar, o backend retorna o próximo valor da fila se houver; senão rola random. Mestre vê e edita.

## Segurança / autorização

- Toda rota autenticada exige cookie `auth` (JWT assinado com `JWT_SECRET`).
- Personagens: só o `ownerId` lê/edita. Mestre da campanha vê em modo readonly.
- Campanhas: só o `dmId` edita configuração; jogadores leem e adicionam o próprio personagem.
- Telão: rota pública por `screenToken` — qualquer um com o link vê. Token rotacionável.
- Dice rig: só o mestre cria/edita; o jogador alvo nunca vê a fila.
- Testes garantem que ninguém de fora consegue acessar/editar (CR essencial).

## Engine de progressão automática

O ponto crítico aqui é o pedido do Renan: "ganhos por evolução/ciclo entram direto no personagem, não são escolha". Modelei como **descritor declarativo por classe+subclasse+nível**:

```js
// src/progression/rules.js
{
  classId: 'druid',
  perLevel: {
    1: { cantripsKnown: 2, spellsPrepared: 'wis+level', features: [...] },
    2: { features: [...], subclassChoice: true },
    3: { spellSlotsUpgrade: true },
    // ...
  },
  subclasses: {
    stars: {
      perLevel: {
        2: { autoCantrips: ['guidance'], features: ['starMap', 'starryForm'] },
        // exemplo do Renan: Estrelas no 2 (não 3 como ele lembrou) dá guidance automático
      }
    }
  }
}
```

A função `applyProgression(character)` é **idempotente**: recomputa do zero o que vem por nível/subclasse, sem duplicar truques já adicionados manualmente. Vive no frontend (`src/progression/`) e é re-exportada para o backend para validação.

Cobertura ao final da noite (objetivo): todas as 12 classes do PHB com seus ganhos por nível + as subclasses mais comuns. Falhando isso: pelo menos Druida (Estrelas, Lua, Terra), Guerreiro (Campeão), Mago (Evocação), Clérigo (Vida), Ladino (Trapaceiro).

## Dice rigging — como funciona pro mestre

1. Mestre abre dashboard da campanha, escolhe um jogador.
2. Adiciona "próximos valores" — ex: pra Renan, próximas 3 rolagens de d20 devem ser `15, 12, 18`.
3. Salvo em `DiceRig.values = [15, 12, 18]`.
4. Quando o jogador clica "rolar d20", o frontend chama `/api/dice/roll` (não rola local).
5. Backend retorna o primeiro valor de `values` (e o consome) — se vazio, rola random.
6. Tudo é registrado em log que só o mestre vê.

**Por que via servidor?** Se o frontend rolasse localmente, o mestre não teria como interferir. A trade-off é que requer rede pra cada rolagem — mitigado com Socket.io (latência baixa).

## Caminhos onde fui conservador / TODOs

- **Sem OAuth ainda** — só email/senha. TODO: GitHub/Google quando o Renan quiser. Já deixei o `auth.js` modular pra adicionar provider.
- **Sem rate limiting** — o backend está exposto sem proteção contra brute-force. Adicionar `express-rate-limit` antes de produção.
- **Sem reset de senha** — TODO. Requer mailer (SendGrid/Resend).
- **Sem migration runner em prod** — `prisma db push` em dev; em prod usar `prisma migrate deploy`.
- **Telão usa polling de 2s** se Socket.io falhar — fallback simples, não tentei recuperação avançada.
- **Engine de progressão** prioriza ganhos não-escolha. Onde há escolha (ex: subclasse, fighting style), o jogador continua escolhendo no Creator. Mestre pode aprovar.

## Como rodar (dev)

```bash
# raiz: frontend
npm install
npm run dev          # http://localhost:5173

# server: backend
cd server
npm install
npm run db:push      # cria SQLite local
npm run dev          # http://localhost:4000
```

Variáveis em `server/.env` (ver `server/.env.example`).

## Como deploy

- Frontend já está no Vercel (`vercel.json`).
- Backend pode ir em Render/Railway/Fly. Setar `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`.
- Frontend lê `VITE_API_URL` pra saber onde está o backend.

## Próximos passos sugeridos (de manhã)

1. Testar fluxo: signup → criar personagem → criar campanha → outro user entra → solicita levelup → mestre aprova.
2. Testar telão num celular como TV.
3. Decidir se quer OAuth e qual provider.
4. Encher o resto das subclasses na engine de progressão (deixei estrutura, falta dado).

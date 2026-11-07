# Crítica de design estratégica — Forja de Heróis

Method: dual-agent (A: impeccable-critique-a · B: impeccable-critique-b)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3 | Há feedback de status, mas pouca leitura de progresso entre áreas de configuração. |
| 2 | Match System / Real World | 4 | Vocabulário e fluxos estão ancorados em mesa real de RPG. |
| 3 | User Control and Freedom | 3 | Back/navigation muda por contexto (seção vs subpágina), com risco de desorientação. |
| 4 | Consistency and Standards | 3 | Consistência geral boa, mas com exceções estruturais no fluxo “Advanced → Dice”. |
| 5 | Error Prevention | 4 | Ações destrutivas têm salvaguardas fortes e confirmações explícitas. |
| 6 | Recognition Rather Than Recall | 2 | Usuário precisa lembrar relações entre áreas e pré-condições para recursos avançados. |
| 7 | Flexibility and Efficiency | 3 | Boa base para usuários experientes, mas ainda há fricção de percurso. |
| 8 | Aesthetic and Minimalist Design | 2 | Interface operacional traz densidade textual e ornamentos que elevam carga cognitiva. |
| 9 | Error Recovery | 3 | Estados de erro/salvamento existem, mas mental model de persistência é heterogêneo. |
| 10 | Help and Documentation | 2 | Há explicações inline, porém pouco onboarding progressivo por objetivo. |
| **Total** |  | **29/40** | **Good (com riscos de complexidade acumulada)** |

## Design Specificity Verdict

**Start here:** o produto é **específico e autoral** para o domínio de RPG de mesa; o problema principal não é genericidade, e sim **complexidade operacional acumulada** em pontos críticos da jornada do mestre.

### LLM assessment (independente)

- A superfície de ajustes (`frontend/src/shell/SettingsMenu.jsx`) demonstra forte aderência ao contexto real (convite de campanha, telão, mundo vivo, encerramento de mesa, dados preparados).
- O arranjo mobile list→page e desktop com navegação lateral é bem pensado, mas a quantidade de conceitos em uma única superfície gera custo cognitivo alto para first-time DM.
- A interface acerta no “que” (capacidade), porém pode falhar no “quando” e “em que ordem” (descoberta, priorização, confiança progressiva).

### Deterministic scan (Assessment B)

- Detector no escopo do alvo retornou **5 findings** (todos warning):
  - **3 `side-tab`**
  - **2 `layout-transition`**
- Hotspots:
  - `frontend/src/shell/shell.css:564`
  - `frontend/src/shell/shell.css:923`
  - `frontend/src/shell/shell.css:391`
  - `frontend/src/shell/mesa.css:690`
  - `frontend/src/plans/plans.css:53`
- Caveats/FP:
  - `shell.css:923` é stripe inferior (`::after`), não necessariamente side-tab clássico.
  - `transition: width` em barras de progresso pode ser aceitável dependendo da frequência e área de repaint.

### Convergência A × B

- **Concordância:** há sinais de ruído visual recorrente e alguns padrões de transição que custam fluidez/percepção premium.
- **Divergência relevante:** o detector aponta sintomas visuais locais; a avaliação humana aponta problema mais crítico em arquitetura de jornada (descoberta, priorização e carga cognitiva).

### Visual overlays

Browser overlay não foi executado neste ciclo por indisponibilidade prática de automação/injeção de overlay no contexto de execução atual.

## Overall Impression

Forja de Heróis já se comporta como produto de domínio, não como protótipo. O maior salto de qualidade agora não vem de adicionar features, e sim de **orquestrar melhor as existentes** para que o mestre chegue ao “modo confiança” mais cedo, com menos interpretação e menos ambiguidade operacional.

## What’s Working

1. **Especificidade de produto forte:** linguagem, ações e estados refletem mesa real.
2. **Proteção em ações críticas:** confirmação nominal para fechamento e limpeza evita perda acidental.
3. **Estrutura responsiva consciente:** separação clara entre comportamento mobile e desktop, com bom esforço de acessibilidade base.

## Priority Issues

### [P1] Arquitetura de configuração densa para first-time DM
- **What:** 6 áreas + subfluxos exigem leitura e decisão precoce demais.
- **Why it matters:** aumenta ansiedade, posterga ativação de valor e eleva erro de configuração.
- **Fix:** introduzir trilha de setup orientada por objetivo (“rodar primeira sessão”, “montar telão”, “habilitar dados preparados”), com checklists e ordem recomendada.
- **Suggested command:** `$impeccable onboard`

### [P1] Modelo mental inconsistente de salvamento
- **What:** alguns blocos salvam automaticamente (ex.: capa), outros exigem ação manual explícita.
- **Why it matters:** reduz confiança (“salvou mesmo?”) e pode causar retrabalho.
- **Fix:** padronizar estratégia (autosave + undo ou explicit-save uniforme) com linguagem consistente de estado salvo.
- **Suggested command:** `$impeccable clarify`

### [P1] Recursos avançados com descoberta indireta
- **What:** “Prepared Dice” aparece como subpágina de “Advanced”, com caminhos de entrada múltiplos.
- **Why it matters:** usuários power não chegam rápido; iniciantes não entendem pré-requisitos.
- **Fix:** tratar como item de navegação explícito (com estado locked/available) ou tornar o fluxo mais linear dentro de Advanced.
- **Suggested command:** `$impeccable layout`

### [P2] Ruído visual repetitivo vs clareza operacional
- **What:** padrões de acento lateral/ornamento competem com hierarquia informacional.
- **Why it matters:** em superfícies operacionais, excesso decorativo reduz scanability.
- **Fix:** reduzir acentos repetidos, preservar contraste sem sobrecarga decorativa.
- **Suggested command:** `$impeccable quieter`

### [P2] Dívida de transição entre fluxos novos e legados
- **What:** coexistência prolongada de caminhos `legacy` eleva complexidade de manutenção e entendimento.
- **Why it matters:** aumenta chance de regressão e desacelera evolução de UX.
- **Fix:** cronograma explícito de depreciação por domínio e simplificação progressiva da navegação/estado.
- **Suggested command:** `$impeccable distill`

## Persona Red Flags

### Persona: Mestre iniciante (primeira campanha no app)
- Pode confundir “essencial para jogar hoje” com “opcional avançado”.
- Risco de travar em linguagem densa antes de configurar o mínimo viável.

### Persona: Mestre experiente/power user
- Precisa de caminho mais direto para ações recorrentes (dados preparados, estado de mesa, ajustes críticos).
- Fricção de percurso em submenus reduz sensação de ferramenta “de combate” (rápida).

### Persona: Jogador mobile em sessão ao vivo
- Pequenas inconsistências de navegação e controle podem impactar tempo de resposta durante momentos de mesa.
- Alvos menores em alguns pontos ainda degradam confiança de toque.

## Minor Observations

- A documentação técnica está robusta, mas faltava uma camada estratégica de design contínuo (agora adicionada por este documento).
- O app já possui base de identidade visual forte; o ganho agora é curadoria de ritmo visual por contexto (Operate > ornamentação).

## Questions to Consider

1. Qual é o **mínimo caminho canônico** para um DM sair de “campanha criada” para “sessão rodando com confiança” em menos de 5 minutos?
2. Quais áreas de Settings são **obrigatórias**, **recomendadas** e **avançadas** — e isso está visível sem leitura longa?
3. O produto quer maximizar “potência de configuração” ou “velocidade de operação”? Onde essa decisão está explícita na interface?

## Snapshot & Trend

- **Persistido em:** `.impeccable/critique/2026-11-06T17-55-01Z__frontend-src-shell-settingsmenu-jsx.md`
- **Trend (`frontend-src-shell-settingsmenu-jsx`, últimos 5 runs):** **29/40**
- **Status:** primeira execução registrada para este alvo (sem histórico comparativo ainda).

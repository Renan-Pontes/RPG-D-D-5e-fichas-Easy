# Auditoria técnica e UX — Forja de Heróis

_Data:_ 2026-11-06  
_Escopo:_ web app (`frontend/` + documentação de produto), com foco em UX, performance, responsividade, theming e integridade de implementação.

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2/4 | Há boa base de acessibilidade, mas persistem alvos interativos abaixo de 44x44 e controles pequenos em fluxos críticos. |
| 2 | Performance | 2/4 | Build atual gera chunks muito grandes (até ~1.69 MB minificado) e há transições de layout (`width/height/margin`) em múltiplas telas. |
| 3 | Responsive Design | 3/4 | Projeto é mobile-aware e usa breakpoints, mas ainda há inconsistências de ergonomia em componentes pontuais. |
| 4 | Theming | 2/4 | Sistema de tokens existe e é rico, porém com alto volume de cores hardcoded e variação visual não sistematizada. |
| 5 | Implementation Integrity | 2/4 | Detector reportou 74 achados (58 “slop”), e a base mantém muita rota/camada legada (`legacy`) em paralelo ao fluxo novo. |
| **Total** |  | **11/20** | **Acceptable (significant work needed)** |

Bandas: 18-20 Excellent, 14-17 Good, 10-13 Acceptable, 6-9 Poor, 0-5 Critical.

## Implementation Integrity Verdict

**Parcialmente aprovado (não bloqueante, mas com dívida estrutural relevante).**

### Evidências verificadas

- O detector Impeccable retornou **74 achados**, todos como warning, com predominância de padrões visuais repetitivos (“side-tab accents”, “bounce easing”, “gradient text”) e pontos de qualidade/perf (`transition: width/height/margin`).
  - Ex.: `frontend/src/app-extra-styles.css:232`, `.../creator.css:13`, `.../screen/tv-styles.css:279`, `frontend/styles.css:898`.
- A base mantém **muitos caminhos de compatibilidade**: contagem de **92 referências `legacy`** em `frontend/src` (ex.: `src/play/combat-actions.js`, `src/stage/stage-api.js`, `src/shell/useArea.js`), sinal de transição longa entre arquiteturas.
- Há falsos positivos do detector para “broken-image” em `ficha.css` (linhas que contêm `<img>` em comentário/seletor CSS), portanto nem todo warning é bug real de runtime.

**Leitura executiva:** o produto é coerente e funcional, mas ainda mistura camada moderna com camada transitória e convenções visuais heterogêneas; isso reduz previsibilidade de manutenção e consistência de experiência.

## Executive Summary

- **Audit Health Score:** **11/20** (**Acceptable**)
- **Total issues relevantes:** 12
  - **P0:** 0
  - **P1:** 4
  - **P2:** 6
  - **P3:** 2
- **Top issues**
  1. Payload de frontend alto e chunking insuficiente para dados SRD/progressão/app.
  2. Vários pontos com animação de propriedades de layout (risco de jank).
  3. Alvos de toque e controles abaixo do ideal em partes da jornada mobile.
  4. Dívida de arquitetura legada + vulnerabilidades de tooling frontend.

## Detailed Findings by Severity

### P1 Major

#### [P1] Chunks grandes e custo de carregamento inicial elevado
- **Location:** build de produção (`npm run build`), chunks `app-DfQGqAXK.js` (~1.69 MB), `srd-BwxkjxNC.js` (~1.49 MB), `progression-BnJ34NzU.js` (~869 KB), `bestiary-CKPa7meO.js` (~748 KB).
- **Category:** Performance
- **Impact:** aumento de tempo de carregamento/parse em dispositivos medianos, piora de TTI e consumo de dados.
- **Standard:** Web performance baseline (LCP/TTI/INP impactados por JS payload alto).
- **Recommendation:** segmentar domínio SRD/progressão por rota/feature (lazy real), mover dados pesados para carregamento sob demanda e revisar imports estáticos que anulam dynamic split.
- **Suggested command:** `$impeccable optimize`

#### [P1] Dependências frontend com advisories de severidade alta
- **Location:** `frontend/package.json` + `npm audit --json` (`vite <= 6.4.3`, `source-map-js < 1.2.2`).
- **Category:** Implementation Integrity
- **Impact:** risco de segurança e confiabilidade da toolchain de desenvolvimento/preview.
- **Standard:** higiene de dependências (SCA baseline).
- **Recommendation:** atualizar Vite para versão corrigida e aplicar `npm audit fix` com validação de build/test.
- **Suggested command:** `$impeccable harden`

#### [P1] Alvos interativos pequenos em fluxo mobile
- **Location:** `frontend/src/creator/join-table.css:102` (`radio` 18x18), `frontend/src/app-extra-styles.css:1158` (14x14), múltiplos ícones 22x22 (`app-extra-styles.css:1137` etc.).
- **Category:** Accessibility / Responsive
- **Impact:** toque impreciso, maior erro de interação em celular, frustração em sessão ao vivo.
- **WCAG/Standard:** WCAG 2.5.5 Target Size (AAA) / boas práticas mobile (44x44 px).
- **Recommendation:** elevar alvos efetivos para >= 40-44 px com área clicável no container, não só no ícone.
- **Suggested command:** `$impeccable adapt`

#### [P1] Transições de layout com risco de jank
- **Location:** `frontend/styles.css:898`, `frontend/src/creator/creator.css:13`, `.../screen/tv-styles.css:279`, `.../shell/shell.css:391`, entre outros.
- **Category:** Performance
- **Impact:** animações menos fluidas em telas com carga alta (combate/telão), possível queda de FPS.
- **Standard:** animação orientada a `transform/opacity` para evitar reflow.
- **Recommendation:** trocar transições de `width/height/margin` por transformações e/ou técnicas de container apropriadas.
- **Suggested command:** `$impeccable optimize`

### P2 Minor

#### [P2] Polling com silêncio de erro e sem backoff explícito
- **Location:** `frontend/src/api/polling.js` (intervalo fixo 2500 ms + `catch { /* swallow */ }`).
- **Category:** Performance / Implementation Integrity
- **Impact:** degradação silenciosa de estado ao usuário e loops de retry sem telemetria clara.
- **Recommendation:** adicionar estratégia de backoff, sinalização de falha em UI e logging/observability mínimo.
- **Suggested command:** `$impeccable harden`

#### [P2] Deriva de tokens e alto volume de cores hardcoded
- **Location:** `frontend/src/**/*.css` (contagem aproximada: **411** referências hex).
- **Category:** Theming
- **Impact:** dificulta evolução de tema, consistência visual e manutenção de contraste.
- **Recommendation:** consolidar mapa de tokens semânticos por superfície e reduzir hex direto a exceções justificadas.
- **Suggested command:** `$impeccable extract`

#### [P2] Ruído visual sistêmico detectado (“side-tab”, bounce, gradients decorativos)
- **Location:** detector (58 achados “slop”), arquivos recorrentes: `ficha.css`, `app-extra-styles.css`, `styles.css`, `creator.css`, `tv-styles.css`.
- **Category:** Implementation Integrity / UX
- **Impact:** aparência menos premium e mais inconsistente entre áreas, reduz percepção de qualidade.
- **Recommendation:** racionalizar acentos laterais, easing e ornamentos, priorizando hierarquia funcional.
- **Suggested command:** `$impeccable quieter`

#### [P2] Valor percebido alto para DM, mas onboarding cognitivo ainda pesado
- **Location:** `frontend/src/shell/SettingsMenu.jsx` (6 áreas + subfluxos), múltiplos painéis especializados.
- **Category:** UX / Value Proposition
- **Impact:** novos mestres podem demorar para atingir “momento de valor” e abandonar recursos avançados.
- **Recommendation:** criar trilha guiada por objetivo (“primeira sessão em 5 passos”) com defaults inteligentes.
- **Suggested command:** `$impeccable onboard`

#### [P2] Base em transição prolongada entre fluxos novos e legados
- **Location:** `frontend/src/play/combat-actions.js`, `src/stage/stage-api.js`, `src/shell/useArea.js`, etc.
- **Category:** Implementation Integrity
- **Impact:** aumenta custo de manutenção e chance de regressão em mudanças cross-feature.
- **Recommendation:** definir janela de depreciação e plano explícito de remoção de `legacy` por domínio.
- **Suggested command:** `$impeccable distill`

#### [P2] Indicador de build/perf no README está desatualizado para o estado atual
- **Location:** `README.md` menciona bundles reduzidos em histórico, mas não exibe baseline atual de build.
- **Category:** Value Proposition / Documentation Integrity
- **Impact:** percepção de desempenho pode divergir da realidade medida.
- **Recommendation:** publicar baseline de bundle e budget alvo no README/HANDOFF.
- **Suggested command:** `$impeccable clarify`

### P3 Polish

#### [P3] Falsos positivos “broken-image” no detector em `ficha.css`
- **Location:** `frontend/src/sheet/ficha.css` (ocorrências em comentário/seletor com `<img>`).
- **Category:** Implementation Integrity
- **Impact:** ruído de auditoria.
- **Recommendation:** ajustar regra do detector para parsing CSS/contexto ou ignorar padrão nesse arquivo.
- **Suggested command:** `$impeccable audit`

#### [P3] Uso de recursos CSS modernos sem baseline explícito de suporte
- **Location:** `styles.css` (`:has(...)`, `color-mix(...)` em vários arquivos).
- **Category:** Responsive / Implementation Integrity
- **Impact:** risco em navegadores não alinhados com baseline moderno.
- **Recommendation:** documentar oficialmente o baseline de browser suportado.
- **Suggested command:** `$impeccable clarify`

## Patterns & Systemic Issues

1. **Dívida de transição:** coexistência prolongada de fluxos `legacy` e novos.
2. **Performance visual vs operacional:** forte identidade estética, porém com custo técnico recorrente em animações/efeitos e payload.
3. **Theming não totalmente governado:** tokens maduros coexistindo com grande volume de valores diretos.
4. **QoL fragmentado:** recursos poderosos, mas descoberta e ativação ainda exigem esforço alto em parte do público.

## Positive Findings

- Há base sólida de acessibilidade já implantada (`skip-link`, `focus-visible`, `prefers-reduced-motion`).
- O produto tem proposta de valor diferenciada e clara para mesas de D&D (ficha + campanha + telão + progressão + rigging).
- A arquitetura frontend já usa lazy loading e split por feature (não é monolito único).
- Documentação operacional é extensa (`API.md`, `DEPLOY.md`, `DECISIONS.md`, `HANDOFF.md`).

## Recommended Actions (priority order)

1. **[P1] `$impeccable optimize`**: reduzir payload e remover transições de layout críticas (chunks >700 KB e jank hotspots).
2. **[P1] `$impeccable harden`**: atualizar dependências com advisories e reforçar resiliência do polling.
3. **[P1] `$impeccable adapt`**: corrigir alvos touch subdimensionados em fluxos mobile.
4. **[P2] `$impeccable quieter`**: reduzir ruído visual repetitivo e elevar consistência premium.
5. **[P2] `$impeccable onboard`**: simplificar entrada de novos mestres com jornada guiada e defaults.
6. **[P2] `$impeccable extract`**: consolidar tokens e remover hardcoded colors dispersos.
7. **[P2] `$impeccable distill`**: plano de aposentadoria da camada `legacy`.
8. **[P2] `$impeccable clarify`**: alinhar README com baseline real de performance e suporte.
9. **[P3] `$impeccable audit`**: repetir auditoria após correções para medir evolução.
10. **[P2/P3] `$impeccable polish`**: passe final de acabamento e consistência depois dos fixes.

You can ask me to run these one at a time, all at once, or in any order you prefer.

Re-run `$impeccable audit` after fixes to see your score improve.

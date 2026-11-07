# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Mestre (DM)** de mesas de D&D 5e que precisa preparar sessão, conduzir combate, gerir campanha, acompanhar evolução dos personagens e operar a mesa/telão com baixo atrito.
- **Jogadores** que precisam criar e manter ficha completa, entrar em campanhas via código, rolar dados no fluxo da mesa e acompanhar estado de personagem em qualquer dispositivo.
- **Participantes presenciais/online da sessão** que consomem o estado público da partida via telão/TV.

## Product Purpose

Forja de Heróis é uma ferramenta web de ficha e operação de mesa para D&D 5e (base SRD), focada em unir três fluxos que normalmente ficam separados: gerenciamento de ficha, coordenação de campanha e exibição de mesa/telão. O objetivo é reduzir fricção operacional da sessão, manter consistência de regras e dar ao mestre controle suficiente para condução dramática sem perder velocidade.

Sucesso do produto é: personagens e campanhas persistentes na nuvem, progressão confiável, fluxo de aprovações mestre↔jogador funcional, rolagens e estado de combate consistentes e experiência utilizável tanto no celular do jogador quanto no telão da mesa.

## Positioning

O diferencial central é a combinação de **ficha de D&D 5e + coordenação de campanha + telão de mesa + engine de progressão automática + rigging de dados orientado ao mestre** em uma única aplicação web com deploy de baixo custo (Vercel + PythonAnywhere). Um concorrente pode oferecer ficha ou VTT; aqui a proposta é o pacote integrado com foco explícito na operação real da sessão.

## Operating Context

- Uso em campanha recorrente com papéis distintos (DM e jogadores), convite por código e associação de personagem por membro.
- Mesa híbrida: parte da interação no app do jogador (mobile/desktop) e parte em exibição pública (`/tv/<token>`).
- Regras operacionais incluem aprovações de evolução, controle de combate/iniciativa, recursos de descanso e inventário, e suporte bilíngue PT/EN.
- O backend opera em ambiente com restrições de realtime (polling em vez de WebSocket no plano alvo), impactando escolhas técnicas de sincronização.
- Há trilha de planejamento ativa para evolução de “telão” para “mesa” unificada e para painéis avançados de métricas do mestre.

## Capabilities and Constraints

- **Capacidades confirmadas**
  - Auth por conta, personagens persistidos na nuvem com fallback local.
  - Campanhas com DM/jogadores, invite code, screen token e estado de sessão.
  - Workflow de aprovação (ex.: level up) com aplicação server-side das mudanças.
  - Engine de progressão declarativa (frontend + espelho backend), cobrindo classes/subclasses e ganhos automáticos não-opcionais.
  - Dice rigging por jogador/tipo de dado com fila consumida no backend e log para DM.
  - Telão público com status de personagens, iniciativa e elementos de sessão.
  - Export/import de PDF de ficha em layout compatível.
  - Administração e limites de plano no backend (com bloqueio por custo, sem apagar dados ao exceder limite).

- **Restrições confirmadas**
  - Realtime por polling (alvo atual de hospedagem não oferece WebSocket no plano base).
  - Nem todo conteúdo de suplementos está automatizado; parte é manual/resumo orientativo.
  - Nem todas as escolhas complexas de classe/subclasse/sistema estão fechadas em automação total.
  - Conteúdo fora SRD exige validação no livro-fonte correspondente.
  - Parte do roadmap de mesa/métricas ainda depende de novas estruturas e endpoints.

- **Estado evolutivo relevante**
  - Existe plano detalhado para “Mesa” (rework do telão com mapa, névoa, ping, feed unificado de eventos) e “Métricas” (análises de party para DM), já documentado mas não totalmente consolidado como baseline de produto.

## Brand Commitments

- Identidade temática medieval/fantasia sombria aplicada à interface (paleta dourado/couro/pergaminho, tipografia serifada, estética diegética).
- Produto bilíngue PT/EN com foco primário de comunicação em português.
- Posicionamento de ferramenta prática de mesa: clara para usar em sessão real, sem depender de fluxo acadêmico de configuração.
- Compromisso explícito de não se apresentar como afiliado à Wizards of the Coast.

## Evidence on Hand

- Documentação técnica e de produto já presente: `README.md`, `API.md`, `DECISIONS.md`, `HANDOFF.md`, `DEPLOY.md`, `PLANO-MESA-E-METRICAS.md`, `RULES.md`, `AUDIT.md`, `CRITIQUE.md`.
- Implementação ativa em duas camadas:
  - Frontend React/Vite (`frontend/`) com módulos de auth, campanhas, ficha, combate, telão, progressão e estilos.
  - Backend Django/DRF (`backend/`) com modelos, autorização, endpoints por domínio, testes e utilitários operacionais.
- Fonte visual incumbente existente e consistente (`frontend/styles.css` e folhas por área, como `frontend/src/shell/shell.css`).
- Evidências de operação e cobertura funcional descritas em handoff e testes.
- **Ausências relevantes de prova comercial externa:** não há, neste material, prova pública validada de adoção em escala, métricas de retenção reais publicadas ou depoimentos verificados de clientes finais.

## Product Principles

1. **Mesa primeiro:** tudo que importa na sessão deve ser rápido de operar sob pressão, com poucos passos e alta legibilidade.
2. **Consistência de regra com pragmatismo:** automação onde reduz erro recorrente; fluxo manual explícito onde a regra exige decisão humana.
3. **Controle do mestre sem fricção excessiva para jogador:** o DM coordena campanha e dramaticidade, enquanto o jogador mantém autonomia de ficha no dia a dia.
4. **Baixo custo operacional sustentável:** arquitetura e recursos devem respeitar o teto econômico definido para manter o produto viável.
5. **Evolução incremental com compatibilidade:** novos sistemas (mesa/métricas/planos) entram sem quebrar campanhas e fichas já existentes.

## Accessibility & Inclusion

- Base já contém medidas de acessibilidade operacional: skip link, `:focus-visible`, suporte a `prefers-reduced-motion`, ajustes mobile-first para alvos de toque e tipografia mínima em iOS.
- O produto precisa continuar priorizando legibilidade em ambientes de sessão (distância, baixa luz, telas diversas) e garantir que ações críticas possam ser executadas em dispositivos móveis comuns.

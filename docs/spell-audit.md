# Auditoria das magias (SRD 5.2.1 e SRD 5.1)

Conferência: 12/11/2026. Testes: `frontend/tests/spell-text-srd.test.js`.

## SRD 5.2.1 — fichas 2024 (`data/srd2024-spells.json`, 339 magias)

- Fonte: `public/rules/SRD-5.2.1.pdf` (texto extraído com `pdftotext`).
- Cada frase do texto e cada tempo de conjuração, alcance, componentes e duração foi
  procurado no PDF (comparação só por letras e números): **339 de 339 batem**.
- Na volta (frases do PDF que faltariam no app) não sobrou omissão real: o que apareceu foi
  intercalação de colunas da extração.
- Corrigido o formato herdado da extração: tabulação no lugar de parágrafo (608), espaços
  duplos (3.280), palavras partidas no fim da linha (`condi-tion`, `Dark-ness`, `demi-plane`),
  cabeçalhos de tabela fora do lugar e a linha "1" sem número na tabela de Confusão.
- Tabelas refeitas em linhas `coluna | coluna`: Confusão, Reencarnação, Controlar o Clima,
  Vidência e Teletransporte. Fichas de criatura (Animar Objetos, Encontrar Montaria, Inseto
  Gigante, Invocar Dragão) com um campo por linha, e o nome "Otherworldly Steed" separado.

## SRD 5.1 — fichas 2014 (`data/srd51-spells-meta.json` + `srd51-spells-text.json`, 319 magias)

- Fonte: SRD 5.1 (CC-BY 4.0) em Markdown, do acervo local do GM Craft
  (`oldmanumby-dnd.srd.5.1`).
- Antes: as fichas 2014 mostravam resumos curtos e, ao abrir a magia, o texto **de 2024**.
  Agora as 309 magias do catálogo 2014 que estão no SRD 5.1 usam a ficha técnica oficial
  (círculo, escola, tempo, alcance, componentes, duração, ritual, concentração) e o texto
  integral do SRD 5.1. 210 dessas tinham pelo menos um campo diferente do oficial.
- Em português a ficha 2014 mostra o resumo em pt (não há tradução oficial do SRD 5.1).

## Fora do SRD

- 211 magias do catálogo 2014 e as magias extras de 2024 (PHB 2024 e suplementos) não estão
  em nenhum SRD. O texto delas é de livro pago: o app guarda só metadados e um resumo
  original, e isso não muda (veja `public/rules/README.md`).

# Regras e fontes

Novas fichas usam `rulesVersion: "2024"`: revisão de D&D 5e (2024/5.5e), com o SRD 5.2.1 corrigido. Fichas antigas sem esse campo preservam a progressão de 2014. Conferência de fontes: 21/09/2026.

- [SRD oficial e histórico das versões](https://www.dndbeyond.com/srd).
- [SRD 5.2.1 completo](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf), disponível também em `/rules/SRD-5.2.1.pdf`.
- [Erratas oficiais do Player’s Handbook](https://www.dndbeyond.com/sources/dnd/sae/players-handbook).
- [Artífice revisado em Eberron: Forge of the Artificer](https://www.dndbeyond.com/posts/2106-whats-new-with-the-artificer-in-eberron-forge-of).

## Cobertura e limites

As tabelas de níveis 1–20 das 12 classes do SRD atual e suas subclasses de referência foram importadas, junto de 339 magias e nove espécies do SRD. Há também o artífice e um catálogo ampliado de espécies e subclasses de suplementos. Os aumentos de atributos das fichas atuais vêm do antecedente; subclasses atuais começam no nível 3. Magias e trechos extraídos do SRD permanecem em inglês, evitando apresentar uma tradução como oficial.

O catálogo ampliado não equivale à automação completa de todos os livros. Opções indicadas como manuais contêm identificação, fonte e resumo: seus traços, escolhas, recursos e exceções precisam ser conferidos no livro correspondente e anotados na ficha. Subclasses antigas compatíveis são identificadas no painel de progressão. Multiclasse, todas as interações de talentos, todos os recursos de suplementos e aplicação automática de toda errata editorial ainda não são cobertos. Uma alteração de regra exige atualizar os dados e executar os testes; o site não busca erratas sozinho.

Escolhas de classe (invocações, metamagia, manobras, estilos de luta, maestria em armas, ordens, expertise etc.), textos revisados dos traços 2024 e as subclasses de todos os livros oficiais ficam em `frontend/data/class-options/` (formato no README de lá), com o motor em `frontend/src/progression/options.js` e a validação espelhada no backend. Traços revisados das espécies 2024 (resumos PT/EN do SRD, mais o Aasimar do PHB 2024 em resumo próprio) e as escolhas de espécie de 2024 e 2014 (linhagens, legados, ancestrais, tamanho, perícia, talento do Humano/humano variante/linhagem personalizada) ficam em `frontend/data/species-2024.js`, com o motor em `frontend/src/progression/species.js` (`char.speciesChoices`; magias da linhagem espelhadas no backend). Talentos estão catalogados em `frontend/data/feats.js`; magias fora do SRD, em `frontend/data/spells-extra.js`. Fora do SRD, tudo é resumo original: o levantamento usou o XML do Aurora Builder apenas como referência de estrutura (nomes, níveis, pré-requisitos), sem copiar texto. Dados do *Eberron: Forge of the Artificer* vieram de fonte de terceiros e estão marcados "conferir no livro".

Os dados antigos são mantidos somente para compatibilidade com fichas existentes; não são a versão padrão de novas fichas. Os dados de progressão do backend são gerados pelo mesmo catálogo usado pelo frontend:

```sh
node scripts/sync-rules.mjs
node scripts/sync-rules.mjs --check
```

## PDF no formato da ficha de D&D 5e

A ficha exporta um PDF editável no layout clássico de 3 páginas (`frontend/src/pdf/`). O desenho é nosso; só as posições e os nomes dos campos seguem a ficha preenchível oficial, então o arquivo abre em qualquer leitor de PDF e volta para cá (ou vai para outras ferramentas) pela importação. Texto longo diminui até 6 pt; o que não couber vai para páginas de continuação, com o texto completo das características. Se houver mais magias do que linhas, a página de magias se repete, uma sequência por classe conjuradora.

A importação lê PDFs com formulário (ficha oficial preenchida, D&D Beyond, nossa exportação). O que não bater com o catálogo (subclasse, magia homebrew etc.) vai para as anotações da ficha. PDFs escaneados ou achatados não têm campos para ler.

O mapa de campos (`dnd5e-layout.js`) é gerado por `scripts/extract_dnd5e_sheet_layout.py` a partir do PDF oficial, que não fica no repositório.

## Atribuição

This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://www.dndbeyond.com/srd. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

A licença do SRD não se estende ao conteúdo de suplementos comerciais. Referências a esses livros e resumos originais não substituem sua aquisição e consulta. Este projeto não é afiliado à Wizards of the Coast.

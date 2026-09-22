# Regras e fontes

Novas fichas usam `rulesVersion: "2024"`: revisão de D&D 5e (2024/5.5e), com o SRD 5.2.1 corrigido. Fichas antigas sem esse campo preservam a progressão de 2014. Conferência de fontes: 21/09/2026.

- [SRD oficial e histórico das versões](https://www.dndbeyond.com/srd).
- [SRD 5.2.1 completo](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf), disponível também em `/rules/SRD-5.2.1.pdf`.
- [Erratas oficiais do Player’s Handbook](https://www.dndbeyond.com/sources/dnd/sae/players-handbook).
- [Artífice revisado em Eberron: Forge of the Artificer](https://www.dndbeyond.com/posts/2106-whats-new-with-the-artificer-in-eberron-forge-of).

## Cobertura e limites

As tabelas de níveis 1–20 das 12 classes do SRD atual e suas subclasses de referência foram importadas, junto de 339 magias e nove espécies do SRD. Há também o artífice e um catálogo ampliado de espécies e subclasses de suplementos. Os aumentos de atributos das fichas atuais vêm do antecedente; subclasses atuais começam no nível 3. Magias e trechos extraídos do SRD permanecem em inglês, evitando apresentar uma tradução como oficial.

O catálogo ampliado não equivale à automação completa de todos os livros. Opções indicadas como manuais contêm identificação, fonte e resumo: seus traços, escolhas, recursos e exceções precisam ser conferidos no livro correspondente e anotados na ficha. Subclasses antigas compatíveis são identificadas no painel de progressão. Multiclasse, todas as interações de talentos, todos os recursos de suplementos e aplicação automática de toda errata editorial ainda não são cobertos. Uma alteração de regra exige atualizar os dados e executar os testes; o site não busca erratas sozinho.

Os dados antigos são mantidos somente para compatibilidade com fichas existentes; não são a versão padrão de novas fichas. Os dados de progressão do backend são gerados pelo mesmo catálogo usado pelo frontend:

```sh
node scripts/sync-rules.mjs
node scripts/sync-rules.mjs --check
```

## Atribuição

This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://www.dndbeyond.com/srd. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

A licença do SRD não se estende ao conteúdo de suplementos comerciais. Referências a esses livros e resumos originais não substituem sua aquisição e consulta. Este projeto não é afiliado à Wizards of the Coast.

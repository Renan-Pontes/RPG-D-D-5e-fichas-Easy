// Backend v1.0.136: só o mestre recebe inviteCode; membro liga outra ficha pelo id da campanha.
// As telas não buscam mais o detalhe da campanha atrás de um código que o jogador não recebe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
for (const f of ['src/sheet/CampaignLinkModal.jsx', 'src/sheet/VersionsModal.jsx', 'src/group/PlayersPanel.jsx']) {
  test(`${f}: entra pelo id sem buscar o código de convite`, () => {
    const s = fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(s, /inviteCode\s*=\s*d(etail)?\?\.campaign\?\.inviteCode/);
    assert.match(s, /joinCampaign\(\{[\s\S]{0,40}campaignId/);
  });
}

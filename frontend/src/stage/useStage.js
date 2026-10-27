// O palco do mestre agora: o do GET da campanha (campaign.stage, o palco cru com
// os nomes — numa campanha de antes do palco, montado do cartão antigo —, que
// chega pelo poll da casca) ou o que voltou do último POST /stage (evento
// `forja:stage` do stage-api), o mais novo dos dois. Assim Jogar › Tela e o 📺
// do cabeçalho mudam na hora do toque, sem polling próprio.
import { useEffect, useState } from 'react';
import { STAGE_EVENT } from './stage-api.js';
import { newestStage } from './stage-now.js';

export default function useStage(campaign) {
  const [pushed, setPushed] = useState(null);
  const id = campaign?.id;
  useEffect(() => {
    if (id == null || typeof window === 'undefined') return undefined;
    const on = (e) => { if (String(e.detail?.campaignId) === String(id)) setPushed(e.detail.stage); };
    window.addEventListener(STAGE_EVENT, on);
    return () => window.removeEventListener(STAGE_EVENT, on);
  }, [id]);
  return newestStage(campaign?.stage || campaign?.state?.stage || null, pushed);
}

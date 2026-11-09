/**
 * Vercel Serverless Function Proxy
 * Bypasses CORS and network blocks for RPG monster statblock imports
 * (D&D Wiki, Wikidot, Open5e, compendiums, arbitrary sites) on Vercel.
 * Compatible with Node.js and Edge runtimes.
 */
async function fetchWithFallback(url, timeoutMs = 8000) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/plain,text/html,*/*',
  };

  // 1. Tentar busca direta
  try {
    const upstream = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    const text = await upstream.text();
    const isCloudflareChallenge = text.includes('<title>Just a moment...</title>') || text.includes('cf-browser-verification');
    if (upstream.ok && !isCloudflareChallenge && text.trim().length > 30) {
      return { status: upstream.status, text };
    }
  } catch {
    // continua para fallback
  }

  // 2. Fallback via Edge Worker
  try {
    const workerUrl = `https://cors-get-proxy.sirjosh.workers.dev/?url=${encodeURIComponent(url)}`;
    const workerRes = await fetch(workerUrl, { signal: AbortSignal.timeout(timeoutMs) });
    const text = await workerRes.text();
    if (workerRes.ok && text.trim().length > 30) {
      return { status: 200, text };
    }
  } catch {
    // continua
  }

  // 3. Fallback via AllOrigins
  try {
    const aoRes = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(timeoutMs) });
    const data = await aoRes.json();
    if (data?.contents && data.contents.trim().length > 30) {
      let contents = data.contents;
      if (typeof contents === 'string' && contents.startsWith('data:') && contents.includes(';base64,')) {
        const b64 = contents.split(';base64,')[1];
        try {
          if (typeof Buffer !== 'undefined') {
            contents = Buffer.from(b64, 'base64').toString('utf-8');
          } else if (typeof atob === 'function') {
            contents = decodeURIComponent(escape(atob(b64)));
          }
        } catch {
          // fallback
        }
      }
      return { status: 200, text: contents };
    }
  } catch {
    // esgotado
  }

  throw new Error('Upstream unreachable or protected by challenge');
}

export default async function handler(req, res) {
  // If Edge runtime (Web standard Request / Response)
  if (!res || typeof res.setHeader !== 'function') {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'missing_url' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    try {
      const result = await fetchWithFallback(targetUrl);
      return new Response(result.text, {
        status: result.status,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'proxy_failed', detail: err?.message || String(err) }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  }

  // Node runtime (IncomingMessage + ServerResponse)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const queryUrl = req.query?.url || (req.url && new URL(req.url, 'http://localhost').searchParams.get('url'));
  if (!queryUrl) {
    return res.status(400).json({ error: 'missing_url' });
  }

  try {
    const result = await fetchWithFallback(queryUrl);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(result.status).send(result.text);
  } catch (err) {
    return res.status(502).json({ error: 'proxy_failed', detail: err?.message || String(err) });
  }
}

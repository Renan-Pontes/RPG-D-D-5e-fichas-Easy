/**
 * Vercel Serverless Function Proxy
 * Bypasses CORS and network blocks for RPG monster statblock imports
 * (D&D Wiki, Wikidot, Open5e, compendiums, arbitrary sites) on Vercel.
 * Compatible with Node.js and Edge runtimes.
 */
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
      const upstream = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/plain,text/html,*/*',
        },
        signal: AbortSignal.timeout(10000),
      });
      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
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
    const upstream = await fetch(queryUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/plain,text/html,*/*',
      },
      signal: AbortSignal.timeout(10000),
    });

    const text = await upstream.text();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(upstream.status).send(text);
  } catch (err) {
    return res.status(502).json({ error: 'proxy_failed', detail: err?.message || String(err) });
  }
}

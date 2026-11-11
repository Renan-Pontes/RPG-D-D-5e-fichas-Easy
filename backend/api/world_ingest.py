"""
Mundo › Fontes: buscar um link (wiki, imagem, SRD) e digerir num rascunho de cartão.

Puro na parte de leitura (`digest_*`, testável sem rede nem Django) e com um
`fetch()` blindado contra SSRF:
  - só http/https, portas 80/443 (ou a padrão);
  - o host é resolvido e TODO endereço tem de ser público (nada de 127.0.0.1,
    10/8, 192.168/16, 169.254 — metadados de nuvem —, ::1, multicast…);
  - redirecionamentos seguidos à mão (máx. 3), revalidando cada destino;
  - tempo e tamanho limitados (HTML 2 MB, imagem 4 MB, JSON 2 MB).

Formatos que viram rascunho:
  - página HTML genérica: og:title/<title>, og:description/meta description,
    og:image e os primeiros parágrafos do conteúdo (MediaWiki, Fandom,
    D&D Wiki, artigos) sem menus, tabelas, notas de rodapé nem scripts;
  - MediaWiki com API de extratos (Wikipedia): resumo limpo + imagem da página;
  - JSON do SRD (dnd5eapi.co, Open5e): nome, descrição e o tipo sugerido;
  - imagem direta (png/jpeg/webp/gif): vira a imagem do cartão.

O rascunho NUNCA é gravado aqui: o mestre confere e escolhe o que aplicar.
"""
import base64
import html as _html
import ipaddress
import json
import re
import socket
from html.parser import HTMLParser
from urllib.parse import quote, unquote, urljoin, urlsplit

MAX_HTML = 2_000_000
MAX_JSON = 2_000_000
MAX_IMAGE = 4_000_000
MAX_REDIRECTS = 3
TIMEOUT = 8
MAX_BODY_CHARS = 6000
MAX_PARAGRAPHS = 12
UA = 'ForjaDeHerois-WorldIngest/1.0 (+tabletop campaign tool)'
IMAGE_TYPES = ('image/png', 'image/jpeg', 'image/webp', 'image/gif')


class IngestError(ValueError):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


# ------------------------------------------------------------------ segurança
def is_public_ip(ip):
    try:
        a = ipaddress.ip_address(ip)
    except ValueError:
        return False
    if getattr(a, 'ipv4_mapped', None):
        a = a.ipv4_mapped
    return not (a.is_private or a.is_loopback or a.is_link_local or a.is_multicast
                or a.is_reserved or a.is_unspecified)


def check_url(url, resolver=None):
    """Valida esquema/porta/host. `resolver(host) -> [ip]` (injetável nos testes)."""
    if not isinstance(url, str) or len(url) > 500:
        raise IngestError('invalid_url')
    parts = urlsplit(url.strip())
    if parts.scheme not in ('http', 'https') or not parts.hostname:
        raise IngestError('invalid_url')
    if parts.username or parts.password:
        raise IngestError('invalid_url')
    port = parts.port
    if port not in (None, 80, 443):
        raise IngestError('blocked_url')
    host = parts.hostname
    if host.lower() in ('localhost',) or host.lower().endswith(('.local', '.internal', '.localhost')):
        raise IngestError('blocked_url')
    resolve = resolver or _resolve
    ips = resolve(host)
    if not ips or not all(is_public_ip(ip) for ip in ips):
        raise IngestError('blocked_url')
    return parts


def _resolve(host):
    try:
        return list({info[4][0] for info in socket.getaddrinfo(host, None)})
    except (socket.gaierror, UnicodeError):
        raise IngestError('unreachable')


def fetch(url, opener=None, resolver=None):
    """GET com SSRF-guard → (final_url, content_type, bytes)."""
    import urllib.error
    import urllib.request

    class _NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None

    op = opener or urllib.request.build_opener(_NoRedirect)
    cur = url
    for _ in range(MAX_REDIRECTS + 1):
        check_url(cur, resolver)
        req = urllib.request.Request(cur, headers={
            'User-Agent': UA, 'Accept': 'text/html,application/json,image/*;q=0.9,*/*;q=0.5',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'})
        try:
            resp = op.open(req, timeout=TIMEOUT)
        except urllib.error.HTTPError as e:
            if e.code in (301, 302, 303, 307, 308) and e.headers.get('Location'):
                cur = urljoin(cur, e.headers['Location'])
                continue
            raise IngestError('fetch_failed')
        except (urllib.error.URLError, socket.timeout, OSError):
            raise IngestError('unreachable')
        with resp:
            ctype = (resp.headers.get('Content-Type') or '').split(';')[0].strip().lower()
            limit = MAX_IMAGE if ctype.startswith('image/') else (MAX_JSON if 'json' in ctype else MAX_HTML)
            data = resp.read(limit + 1)
            if len(data) > limit:
                if ctype.startswith('image/'):
                    raise IngestError('image_too_large')
                data = data[:limit]
            return resp.geturl() or cur, ctype, data
    raise IngestError('too_many_redirects')


# ------------------------------------------------------------------ texto
_WS = re.compile(r'[ \t\r\f\v]+')
_REFS = re.compile(r'\[(?:\d{1,3}|citation needed|edit|editar|nota \d+)\]', re.I)


def clean_text(s):
    s = _html.unescape(s or '')
    s = _REFS.sub('', s)
    s = _WS.sub(' ', s)
    s = re.sub(r'\n{3,}', '\n\n', s)
    return s.strip()


def summarize(text, limit=280):
    """Primeira(s) frase(s) até `limit` caracteres, sem cortar palavra."""
    t = clean_text(text).replace('\n', ' ')
    if len(t) <= limit:
        return t
    cut = t[:limit]
    dot = max(cut.rfind('. '), cut.rfind('! '), cut.rfind('? '))
    if dot > limit * 0.5:
        return cut[:dot + 1]
    return cut[:cut.rfind(' ')].rstrip(',;:') + '…'


KIND_HINTS = (
    ('place', r'\b(city|town|village|kingdom|empire|region|continent|island|forest|mountain|river|dungeon|'
              r'castle|fortress|temple|tavern|inn|plane|realm|cidade|vila|aldeia|reino|regi[ãa]o|ilha|floresta|'
              r'montanha|masmorra|castelo|templo|taverna|continente|plano)\b'),
    ('faction', r'\b(guild|order|faction|cult|clan|church|organization|organisation|alliance|house|'
                r'guilda|ordem|fac[çc][ãa]o|culto|cl[ãa]|igreja|organiza[çc][ãa]o|alian[çc]a)\b'),
    ('npc', r'\b(he|she|his|her|born|wizard|mage|archmage|cleric|warrior|rogue|king|queen|lord|lady|merchant|priest|ele|ela|nasceu|rei|rainha|'
            r'senhor|senhora|mercador|sacerdote|monster|creature|criatura|monstro|character|personagem)\b'),
    ('item', r'\b(sword|weapon|armor|armour|ring|amulet|staff|wand|potion|artifact|artefato|espada|arma|'
             r'armadura|anel|amuleto|cajado|varinha|po[çc][ãa]o|item m[áa]gico|magic item)\b'),
)


def guess_kind(name, text, url=''):
    u = (url or '').lower()
    for frag, kind in (('/monsters', 'npc'), ('/magic-items', 'item'), ('/magicitems', 'item'),
                       ('/equipment', 'item'), ('/weapons', 'item'), ('/armor', 'item'),
                       ('/spells', 'lore'), ('/races', 'lore'), ('/classes', 'lore'), ('/planes', 'place')):
        if frag in u:
            return kind
    blob = f'{name} {(text or "")[:1500]}'.lower()
    best, score = 'lore', 0
    for kind, pat in KIND_HINTS:
        n = len(re.findall(pat, blob))
        if kind == 'npc':
            n = n // 2  # pronomes são comuns em qualquer texto
        if n > score:
            best, score = kind, n
    return best


# ------------------------------------------------------------------ HTML
SKIP_TAGS = {'script', 'style', 'noscript', 'nav', 'footer', 'header', 'aside', 'form', 'table',
             'sup', 'figure', 'figcaption', 'svg', 'button', 'select', 'iframe', 'template'}
SKIP_CLASS = re.compile(r'(navbox|infobox|toc|reference|reflist|mw-editsection|sidebar|metadata|ambox|'
                        r'hatnote|thumb|gallery|portable-infobox|noprint|wds-|global-navigation|'
                        r'page-header__|cookie|advert|ads?-|share|breadcrumb|comment)', re.I)
CONTENT_CLASS = re.compile(r'(mw-parser-output|mw-content-text|article-body|entry-content|post-content|page-content)', re.I)
BLOCK_TAGS = {'p', 'li', 'h2', 'h3', 'h4', 'blockquote', 'dd'}
VOID_TAGS = {'br', 'img', 'hr', 'meta', 'link', 'input', 'source', 'wbr', 'area', 'base', 'col', 'embed', 'param', 'track'}


class _Digest(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta = {}
        self.title = ''
        self._in_title = False
        self.stack = []          # [(tag, skip, content)]
        self.blocks = []         # [(text, in_content, tag)]
        self._buf = None
        self._buf_tag = None
        self.first_img = None

    def _skipping(self):
        return any(s for _, s, _ in self.stack)

    def _in_content(self):
        return any(c for _, _, c in self.stack)

    def handle_starttag(self, tag, attrs):
        a = {k: (v or '') for k, v in attrs}
        if tag == 'meta':
            key = (a.get('property') or a.get('name') or '').lower()
            if key and a.get('content') and key not in self.meta:
                self.meta[key] = a['content']
            return
        if tag == 'title':
            self._in_title = True
            return
        if tag == 'img' and not self._skipping() and self._in_content() and not self.first_img:
            src = a.get('src') or a.get('data-src') or ''
            try:
                w = int(re.sub(r'\D', '', a.get('width') or '0') or 0)
            except ValueError:
                w = 0
            if src and not src.startswith('data:') and (w == 0 or w >= 120):
                self.first_img = src
        if tag in VOID_TAGS:
            return
        cls = f"{a.get('class', '')} {a.get('id', '')}"
        skip = tag in SKIP_TAGS or bool(SKIP_CLASS.search(cls)) or a.get('role') in ('navigation', 'banner')
        content = tag in ('article', 'main') or bool(CONTENT_CLASS.search(cls))
        self.stack.append((tag, skip, content))
        if tag in BLOCK_TAGS and not self._skipping() and self._buf is None:
            self._buf, self._buf_tag = [], tag

    def handle_endtag(self, tag):
        if tag == 'title':
            self._in_title = False
            return
        if tag in VOID_TAGS:
            return
        # fecha até achar a tag (HTML real é bagunçado)
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                in_content = self._in_content()
                del self.stack[i:]
                if tag == self._buf_tag and self._buf is not None:
                    txt = clean_text(''.join(self._buf))
                    if txt:
                        self.blocks.append((txt, in_content, tag))
                    self._buf, self._buf_tag = None, None
                break

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        elif self._buf is not None and not self._skipping():
            self._buf.append(data)


SITE_SUFFIX = re.compile(r'\s*[\|\-–—:]\s*(Wikipedia|Wikip[ée]dia|Fandom|.*Wiki|D&D Wiki|Dungeons? ?& ?Dragons.*|'
                         r'Forgotten Realms.*|D&D Beyond.*)$', re.I)


def digest_html(raw, url=''):
    """HTML → rascunho {name, summary, body, imageUrl, kind, tags}."""
    text = raw.decode('utf-8', 'replace') if isinstance(raw, bytes) else (raw or '')
    p = _Digest()
    try:
        p.feed(text)
        p.close()
    except Exception:  # noqa: BLE001 — HTML quebrado ainda rende o que já leu
        pass
    m = p.meta
    name = clean_text(m.get('og:title') or p.title or '')
    name = SITE_SUFFIX.sub('', name).strip() or _name_from_url(url)
    blocks = [b for b in p.blocks if b[1]] or p.blocks
    paras = []
    for txt, _c, tag in blocks:
        if tag == 'p' and len(txt) < 40:
            continue
        if tag in ('h2', 'h3', 'h4'):
            if re.match(r'^(references|refer[êe]ncias|see also|veja tamb[ée]m|external links|links externos|'
                        r'notes|notas|contents|[íi]ndice|navigation|gallery|galeria|appearances|apari[çc][õo]es)\b',
                        txt, re.I):
                break  # o resto da página é apêndice
            paras.append(f'## {txt}')
            continue
        if tag == 'li' and len(txt) < 25:
            continue
        paras.append(f'• {txt}' if tag == 'li' else txt)
        if sum(1 for x in paras if not x.startswith('## ')) >= MAX_PARAGRAPHS:
            break
    while paras and paras[-1].startswith('## '):
        paras.pop()
    body = '\n\n'.join(paras)[:MAX_BODY_CHARS].strip()
    desc = clean_text(m.get('og:description') or m.get('description') or m.get('twitter:description') or '')
    first = next((x for x in paras if not x.startswith(('## ', '• '))), '')
    summary = summarize(first if len(first) > len(desc) * 0.6 and first else desc or first)
    img = m.get('og:image') or m.get('twitter:image') or p.first_img or ''
    image_url = urljoin(url, img) if img else ''
    if image_url.startswith('//'):
        image_url = 'https:' + image_url
    return {
        'name': name[:120], 'summary': summary, 'body': body,
        'imageUrl': image_url if image_url.startswith(('http://', 'https://')) else '',
        'kind': guess_kind(name, f'{summary} {body}', url), 'tags': [],
    }


def _name_from_url(url):
    path = urlsplit(url or '').path.rstrip('/')
    last = unquote(path.rsplit('/', 1)[-1]) if path else ''
    last = re.sub(r'\.(html?|php|aspx?)$', '', last, flags=re.I)
    return last.replace('_', ' ').replace('-', ' ').strip()[:120]


# ------------------------------------------------------------------ MediaWiki
WIKI_PATH = re.compile(r'^/(?:wiki|w)/(.+)$')


def mediawiki_api_url(url):
    """Wikipedia/MediaWiki com TextExtracts: URL da API para o resumo limpo, ou ''."""
    parts = urlsplit(url)
    host = (parts.hostname or '').lower()
    m = WIKI_PATH.match(parts.path or '')
    if not m or not host.endswith(('wikipedia.org', 'wikivoyage.org', 'wikisource.org')):
        return ''
    title = unquote(m.group(1))
    return (f'{parts.scheme}://{host}/w/api.php?action=query&format=json&redirects=1'
            f'&prop=extracts|pageimages&exintro=0&explaintext=1&exsectionformat=plain'
            f'&piprop=original&titles={quote(title)}')


def digest_mediawiki_json(raw, url=''):
    data = json.loads(raw.decode('utf-8', 'replace') if isinstance(raw, bytes) else raw)
    pages = ((data or {}).get('query') or {}).get('pages') or {}
    page = next(iter(pages.values()), None) if isinstance(pages, dict) else None
    if not page or 'missing' in page:
        raise IngestError('not_found')
    extract = clean_text(page.get('extract') or '')
    cut = re.split(r'\n\s*(References|Referências|See also|Veja também|External links|Ligações externas|Notes|Notas)\s*\n',
                   extract, maxsplit=1)[0]
    paras = [x.strip() for x in cut.split('\n') if len(x.strip()) > 30][:MAX_PARAGRAPHS]
    body = '\n\n'.join(paras)[:MAX_BODY_CHARS]
    name = clean_text(page.get('title') or _name_from_url(url))
    img = ((page.get('original') or {}).get('source')) or ''
    return {'name': name[:120], 'summary': summarize(paras[0] if paras else ''), 'body': body,
            'imageUrl': img, 'kind': guess_kind(name, body, url), 'tags': []}


# ------------------------------------------------------------------ JSON (SRD)
def _flat(v):
    if isinstance(v, list):
        return '\n\n'.join(_flat(x) for x in v if x)
    if isinstance(v, dict):
        return _flat(v.get('desc') or v.get('description') or v.get('name') or '')
    return str(v) if v is not None else ''


def digest_json(raw, url=''):
    """SRD (dnd5eapi.co / Open5e) e JSON genérico com name/desc."""
    data = json.loads(raw.decode('utf-8', 'replace') if isinstance(raw, bytes) else raw)
    if isinstance(data, dict) and isinstance(data.get('query'), dict) and 'pages' in data['query']:
        return digest_mediawiki_json(raw, url)
    if isinstance(data, dict) and isinstance(data.get('results'), list) and data['results'] and 'name' not in data:
        data = data['results'][0]
    if not isinstance(data, dict):
        raise IngestError('unsupported')
    name = clean_text(str(data.get('name') or data.get('title') or _name_from_url(url)))
    parts = []
    for key in ('desc', 'description', 'text', 'summary', 'higher_level', 'lore'):
        if data.get(key):
            parts.append(_flat(data[key]))
    facts = []
    labels = (('type', 'Tipo/Type'), ('size', 'Tamanho/Size'), ('alignment', 'Alinhamento/Alignment'),
              ('challenge_rating', 'ND/CR'), ('rarity', 'Raridade/Rarity'), ('level', 'Círculo/Level'),
              ('school', 'Escola/School'), ('hit_points', 'PV/HP'))
    for key, label in labels:
        v = data.get(key)
        if isinstance(v, dict):
            v = v.get('name')
        if v not in (None, '', []):
            facts.append(f'{label}: {v}')
    ac = data.get('armor_class')
    if isinstance(ac, list) and ac:
        ac = ac[0].get('value') if isinstance(ac[0], dict) else ac[0]
    if ac not in (None, '', []):
        facts.append(f'CA/AC: {ac}')
    for key in ('special_abilities', 'actions', 'legendary_actions'):
        for a in (data.get(key) or [])[:6]:
            if isinstance(a, dict) and a.get('name'):
                parts.append(f"• {a['name']}: {clean_text(_flat(a.get('desc') or ''))}")
    body = '\n\n'.join(clean_text(x) for x in ([' · '.join(facts)] if facts else []) + parts if x)[:MAX_BODY_CHARS]
    img = data.get('image') or data.get('img_main') or data.get('image_url') or ''
    if img and not str(img).startswith('http'):
        img = urljoin(url, str(img))
    first = next((clean_text(x) for x in parts if x), '')
    kind = guess_kind(name, body, url)
    tags = []
    if 'dnd5eapi' in url or 'open5e' in url:
        tags.append('SRD')
    return {'name': name[:120], 'summary': summarize(first), 'body': body,
            'imageUrl': str(img) if str(img).startswith('http') else '', 'kind': kind, 'tags': tags}


# ------------------------------------------------------------------ imagem
def image_data_url(ctype, data):
    if ctype not in IMAGE_TYPES or not data:
        raise IngestError('unsupported_image')
    if len(data) > MAX_IMAGE:
        raise IngestError('image_too_large')
    return f'data:{ctype};base64,{base64.b64encode(data).decode("ascii")}'


def sniff_image_type(data):
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return 'image/png'
    if data[:3] == b'\xff\xd8\xff':
        return 'image/jpeg'
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return 'image/webp'
    if data[:6] in (b'GIF87a', b'GIF89a'):
        return 'image/gif'
    return ''


# ------------------------------------------------------------------ orquestra
def ingest(url, fetcher=None, with_image=True):
    """URL → {draft, source}. `fetcher(url) -> (final_url, ctype, bytes)`."""
    get = fetcher or fetch
    api = mediawiki_api_url(url)
    draft = None
    final = url
    if api:
        try:
            _f, _ct, raw = get(api)
            draft = digest_mediawiki_json(raw, url)
        except (IngestError, ValueError):
            draft = None
    if draft is None:
        final, ctype, raw = get(url)
        sniff = sniff_image_type(raw[:16]) if raw else ''
        if ctype.startswith('image/') or sniff:
            ct = ctype if ctype in IMAGE_TYPES else sniff
            return {'draft': {'name': _name_from_url(final), 'summary': '', 'body': '', 'kind': 'place',
                              'tags': [], 'imageUrl': final, 'image': image_data_url(ct, raw)},
                    'source': {'url': url, 'type': 'image'}}
        if 'json' in ctype or raw[:1] in (b'{', b'['):
            try:
                draft = digest_json(raw, final)
            except ValueError:
                draft = digest_html(raw, final)
        else:
            draft = digest_html(raw, final)
    draft['image'] = ''
    if with_image and draft.get('imageUrl'):
        try:
            _f, ict, idata = get(draft['imageUrl'])
            ct = ict if ict in IMAGE_TYPES else sniff_image_type(idata[:16])
            if ct:
                draft['image'] = image_data_url(ct, idata)
        except IngestError:
            pass
    if not (draft.get('name') or draft.get('body') or draft.get('image')):
        raise IngestError('nothing_found')
    return {'draft': draft, 'source': {'url': url, 'type': 'wiki' if api else 'page'}}

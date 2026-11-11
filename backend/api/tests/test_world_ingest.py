"""Mundo › Fontes: leitura de links (sem rede: resolver e fetcher falsos)."""
from django.test import SimpleTestCase

from api import world_ingest as WI

PNG = b'\x89PNG\r\n\x1a\n' + b'0' * 32
PUBLIC = lambda host: ['93.184.216.34']
LOCAL = lambda host: ['127.0.0.1']


class NormalizeImageUrlTests(SimpleTestCase):
    def test_reddit_media_viewer_unwraps(self):
        u = 'https://www.reddit.com/media?url=https%3A%2F%2Fi.redd.it%2Fabc123.jpg'
        self.assertEqual(WI.normalize_image_url(u), 'https://i.redd.it/abc123.jpg')

    def test_imgur_page_becomes_direct_image(self):
        self.assertEqual(WI.normalize_image_url('https://imgur.com/Hdoikoc'), 'https://i.imgur.com/Hdoikoc.jpeg')
        # álbuns e galerias não são uma imagem só: ficam como estão
        self.assertEqual(WI.normalize_image_url('https://imgur.com/a/Hdoikoc'), 'https://imgur.com/a/Hdoikoc')

    def test_google_imgres_unwraps(self):
        u = 'https://www.google.com/imgres?imgurl=https%3A%2F%2Fexample.com%2Fmap.png&h=10'
        self.assertEqual(WI.normalize_image_url(u), 'https://example.com/map.png')

    def test_plain_and_non_string_untouched(self):
        self.assertEqual(WI.normalize_image_url(' https://example.com/a.png '), 'https://example.com/a.png')
        self.assertEqual(WI.normalize_image_url(None), '')


class CheckUrlTests(SimpleTestCase):
    def test_private_and_bad_schemes_blocked(self):
        with self.assertRaises(WI.IngestError) as cm:
            WI.check_url('http://intranet.example/x', LOCAL)
        self.assertEqual(cm.exception.code, 'blocked_url')
        for bad in ('ftp://example.com/x', 'file:///etc/passwd', 'notaurl'):
            with self.assertRaises(WI.IngestError):
                WI.check_url(bad, PUBLIC)

    def test_unwrapped_target_is_still_checked(self):
        # um link "embrulhado" não pode servir de atalho para um endereço interno
        wrapped = 'https://www.reddit.com/media?url=http%3A%2F%2F127.0.0.1%2Fadmin.png'
        with self.assertRaises(WI.IngestError):
            WI.check_url(WI.normalize_image_url(wrapped), lambda h: ['127.0.0.1'])


class IngestTests(SimpleTestCase):
    def test_direct_image_returns_link_not_bytes(self):
        out = WI.ingest('https://example.com/maps/vale.png', fetcher=lambda u: (u, 'image/png', PNG))
        self.assertEqual(out['source']['type'], 'image')
        self.assertEqual(out['draft']['image'], 'https://example.com/maps/vale.png')
        self.assertEqual(out['draft']['imageUrl'], 'https://example.com/maps/vale.png')

    def test_html_page_draft_keeps_og_image_as_link(self):
        html = (b'<html><head><title>Vale Sombrio</title>'
                b'<meta property="og:image" content="https://example.com/vale.jpg"></head>'
                b'<body><p>Um vale coberto de neblina onde o sino toca sozinho todas as noites sem falta.</p></body></html>')
        out = WI.ingest('https://example.com/wiki/vale', fetcher=lambda u: (u, 'text/html', html))
        self.assertEqual(out['draft']['name'], 'Vale Sombrio')
        self.assertEqual(out['draft']['image'], 'https://example.com/vale.jpg')

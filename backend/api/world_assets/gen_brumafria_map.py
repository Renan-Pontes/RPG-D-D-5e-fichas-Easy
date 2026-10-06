"""Gera o mapa (sem rótulos) da vila de exemplo "Vale de Brumafria".

    python3 backend/api/world_assets/gen_brumafria_map.py

Saída: brumafria-map.webp ao lado deste arquivo. Desenho procedural em
pergaminho: rio, lago, estradas, casas, templo, taverna, torre velha na
colina, floresta e névoa. Os nomes vêm dos pins (pt/en), não da imagem.
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

W, H = 1400, 1000
rnd = random.Random(312)
INK = (74, 52, 30)
INK_SOFT = (110, 82, 50)


def parchment():
    base = Image.new('RGB', (W, H), (226, 204, 160))
    noise = Image.effect_noise((W, H), 38).convert('L')
    tint = Image.merge('RGB', (noise.point(lambda v: 150 + v // 3),
                               noise.point(lambda v: 128 + v // 3),
                               noise.point(lambda v: 88 + v // 3)))
    base = Image.blend(base, tint, 0.35).filter(ImageFilter.GaussianBlur(1.2))
    # manchas
    stains = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(stains)
    for _ in range(26):
        x, y, r = rnd.randint(0, W), rnd.randint(0, H), rnd.randint(40, 180)
        d.ellipse((x - r, y - r, x + r, y + r), fill=rnd.randint(10, 35))
    stains = stains.filter(ImageFilter.GaussianBlur(40))
    dark = Image.new('RGB', (W, H), (150, 112, 62))
    base = Image.composite(dark, base, stains)
    # vinheta
    vig = Image.new('L', (W, H), 0)
    dv = ImageDraw.Draw(vig)
    for i in range(60):
        a = int(255 * (i / 60) ** 2.2)
        dv.rectangle((i * 6, i * 5, W - i * 6, H - i * 5), outline=255 - a, width=6)
    vig = vig.filter(ImageFilter.GaussianBlur(30))
    edge = Image.new('RGB', (W, H), (96, 64, 30))
    return Image.composite(edge, base, vig.point(lambda v: int(v * 0.75)))


def wobble(points, amp=6, step=14):
    out = []
    for (x1, y1), (x2, y2) in zip(points, points[1:]):
        n = max(2, int(math.hypot(x2 - x1, y2 - y1) / step))
        for i in range(n):
            t = i / n
            out.append((x1 + (x2 - x1) * t + rnd.uniform(-amp, amp), y1 + (y2 - y1) * t + rnd.uniform(-amp, amp)))
    out.append(points[-1])
    return out


def smooth(points, k=3):
    pts = points
    for _ in range(k):
        new = [pts[0]]
        for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
            new += [(0.75 * x1 + 0.25 * x2, 0.75 * y1 + 0.25 * y2), (0.25 * x1 + 0.75 * x2, 0.25 * y1 + 0.75 * y2)]
        new.append(pts[-1])
        pts = new
    return pts


def river(d):
    path = smooth(wobble([(-20, 300), (220, 360), (420, 470), (560, 640), (700, 720), (900, 760), (1140, 860), (1420, 900)], 18, 60))
    d.line(path, fill=(120, 150, 150), width=40, joint='curve')
    d.line(path, fill=(150, 178, 172), width=28, joint='curve')
    for off in (-24, 24):
        d.line([(x, y + off) for x, y in path], fill=INK_SOFT, width=2)
    for i in range(0, len(path) - 4, 9):
        x, y = path[i]
        d.arc((x - 8, y - 4, x + 8, y + 4), 200, 340, fill=(90, 120, 122), width=2)
    # lago
    lake = smooth(wobble([(160, 620), (300, 580), (380, 650), (340, 760), (200, 780), (120, 700), (160, 620)], 10, 30))
    d.polygon(lake, fill=(140, 170, 165), outline=INK_SOFT)
    return path


def road(d, pts, width=14):
    p = smooth(wobble(pts, 5, 40), 2)
    d.line(p, fill=(176, 146, 98), width=width, joint='curve')
    d.line(p, fill=(160, 128, 82), width=2)


def house(d, x, y, w=26, h=18, roof=(150, 70, 50)):
    a = rnd.uniform(-0.4, 0.4)
    def rot(px, py):
        return (x + px * math.cos(a) - py * math.sin(a), y + px * math.sin(a) + py * math.cos(a))
    body = [rot(-w / 2, -h / 2), rot(w / 2, -h / 2), rot(w / 2, h / 2), rot(-w / 2, h / 2)]
    d.polygon([(px + 3, py + 4) for px, py in body], fill=(120, 92, 60))
    d.polygon(body, fill=roof, outline=INK)
    d.line([rot(-w / 2, 0), rot(w / 2, 0)], fill=INK, width=2)


def tree(d, x, y, r=None):
    r = r or rnd.randint(9, 16)
    d.ellipse((x - r + 3, y - r + 5, x + r + 3, y + r + 5), fill=(120, 100, 64))
    col = (rnd.randint(78, 100), rnd.randint(106, 128), rnd.randint(62, 78))
    d.ellipse((x - r, y - r, x + r, y + r), fill=col, outline=INK_SOFT)
    d.arc((x - r + 3, y - r + 3, x + r - 5, y + r - 5), 200, 290, fill=(150, 168, 110), width=2)


def hill(d, x, y, s=1.0):
    pts = [(x - 90 * s, y), (x - 40 * s, y - 60 * s), (x + 10 * s, y - 75 * s), (x + 60 * s, y - 40 * s), (x + 100 * s, y)]
    d.line(smooth(pts, 2), fill=INK_SOFT, width=3)
    for i in range(8):
        hx = x - 60 * s + i * 18 * s
        d.line([(hx, y - 10 * s), (hx + 8 * s, y - 28 * s)], fill=INK_SOFT, width=2)


def compass(d, cx, cy, r=60):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=INK, width=3)
    d.ellipse((cx - r + 10, cy - r + 10, cx + r - 10, cy + r - 10), outline=INK_SOFT, width=1)
    for ang, length, fill in ((0, r, (176, 128, 44)), (90, r * 0.7, INK), (180, r * 0.7, INK), (270, r * 0.7, INK),
                              (45, r * 0.45, INK_SOFT), (135, r * 0.45, INK_SOFT), (225, r * 0.45, INK_SOFT), (315, r * 0.45, INK_SOFT)):
        a = math.radians(ang - 90)
        tip = (cx + math.cos(a) * length, cy + math.sin(a) * length)
        l = (cx + math.cos(a + 1.9) * 9, cy + math.sin(a + 1.9) * 9)
        rr = (cx + math.cos(a - 1.9) * 9, cy + math.sin(a - 1.9) * 9)
        d.polygon([tip, l, (cx, cy), rr], fill=fill, outline=INK)
    # "N" desenhado à mão (sem fonte)
    nx, ny = cx, cy - r - 22
    d.line([(nx - 8, ny + 10), (nx - 8, ny - 10), (nx + 8, ny + 10), (nx + 8, ny - 10)], fill=INK, width=3)


def fog(img):
    layer = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(layer)
    for _ in range(40):
        x, y = rnd.randint(-100, W), rnd.randint(-50, H)
        w, h = rnd.randint(160, 420), rnd.randint(30, 80)
        d.ellipse((x, y, x + w, y + h), fill=rnd.randint(40, 90))
    layer = layer.filter(ImageFilter.GaussianBlur(28))
    white = Image.new('RGB', (W, H), (244, 240, 230))
    return Image.composite(white, img, layer)


def main():
    img = parchment()
    d = ImageDraw.Draw(img)
    # floresta a oeste e ao sul
    for _ in range(260):
        x = rnd.gauss(170, 120)
        y = rnd.gauss(220, 140)
        if 0 < x < W and 0 < y < H:
            tree(d, x, y)
    for _ in range(140):
        tree(d, rnd.gauss(1150, 160), rnd.gauss(560, 70))
    for x, y, s in ((980, 260, 1.1), (1140, 200, 1.4), (1260, 300, 0.9), (860, 170, 0.8)):
        hill(d, x, y, s)
    river(d)
    # estradas
    road(d, [(-10, 520), (300, 520), (560, 540), (720, 520), (900, 470), (1100, 330), (1180, 180)])
    road(d, [(640, 1010), (640, 760), (660, 560), (760, 380), (880, 300)], 12)
    road(d, [(560, 540), (480, 420), (430, 260)], 10)
    # ponte
    d.rectangle((622, 690, 668, 750), fill=(150, 112, 70), outline=INK, width=2)
    for i in range(6):
        d.line([(624, 694 + i * 10), (666, 694 + i * 10)], fill=INK_SOFT, width=1)
    # ponte da estrada oeste
    d.rectangle((440, 506, 512, 534), fill=(150, 112, 70), outline=INK, width=2)
    for i in range(7):
        d.line([(446 + i * 10, 508), (446 + i * 10, 532)], fill=INK_SOFT, width=1)
    # casas da vila
    for _ in range(44):
        a = rnd.uniform(0, 2 * math.pi)
        r = abs(rnd.gauss(0, 95))
        x, y = 640 + math.cos(a) * r * 1.4, 520 + math.sin(a) * r
        if 560 < y < 600 and 500 < x < 760:
            continue
        roof = rnd.choice([(150, 70, 50), (132, 84, 58), (120, 62, 46), (104, 96, 88)])
        house(d, x, y, rnd.randint(20, 30), rnd.randint(14, 20), roof)
    # taverna (maior) — pin 0.45, 0.55
    tx, ty = int(0.45 * W), int(0.55 * H)
    house(d, tx, ty, 54, 34, (126, 56, 38))
    d.ellipse((tx + 26, ty - 34, tx + 40, ty - 20), fill=(196, 150, 60), outline=INK, width=2)  # placa
    # templo — pin 0.6, 0.36
    px, py = int(0.6 * W), int(0.36 * H)
    d.polygon([(px - 16, py - 44), (px + 16, py - 44), (px + 16, py - 16), (px + 44, py - 16), (px + 44, py + 16),
               (px + 16, py + 16), (px + 16, py + 44), (px - 16, py + 44), (px - 16, py + 16), (px - 44, py + 16),
               (px - 44, py - 16), (px - 16, py - 16)], fill=(196, 188, 170), outline=INK)
    d.ellipse((px - 12, py - 12, px + 12, py + 12), fill=(176, 128, 44), outline=INK, width=2)  # o sino
    # torre velha na colina — pin 0.82, 0.2
    ox, oy = int(0.82 * W), int(0.2 * H)
    d.ellipse((ox - 26, oy - 26, ox + 26, oy + 26), fill=(120, 112, 104), outline=INK, width=3)
    d.ellipse((ox - 14, oy - 14, ox + 14, oy + 14), fill=(70, 62, 58), outline=INK)
    for i in range(8):
        a = math.radians(i * 45)
        d.rectangle((ox + math.cos(a) * 24 - 4, oy + math.sin(a) * 24 - 4, ox + math.cos(a) * 24 + 4, oy + math.sin(a) * 24 + 4), fill=(140, 132, 120), outline=INK)
    # cemitério / cripta — pin 0.7, 0.3 (ao lado do templo)
    cx, cy = int(0.7 * W), int(0.28 * H)
    d.rectangle((cx - 36, cy - 26, cx + 36, cy + 26), outline=INK_SOFT, width=2)
    for i in range(3):
        for j in range(2):
            gx, gy = cx - 22 + i * 22, cy - 10 + j * 20
            d.line([(gx, gy - 6), (gx, gy + 6)], fill=INK, width=2)
            d.line([(gx - 4, gy - 2), (gx + 4, gy - 2)], fill=INK, width=2)
    img = fog(img)
    d = ImageDraw.Draw(img)
    compass(d, 1270, 860)
    # moldura
    d.rectangle((14, 14, W - 15, H - 15), outline=INK, width=4)
    d.rectangle((26, 26, W - 27, H - 27), outline=INK_SOFT, width=2)
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'brumafria-map.webp')
    img.save(out, 'WEBP', quality=72, method=6)
    print(out, os.path.getsize(out))


if __name__ == '__main__':
    main()

"""Δημιουργεί τις εικόνες PNG του Κιμωλάκη (8 διαθέσεις) για τα email: κανονικές και με στολή Άγιου Βασίλη (santa-*.png).
Χρήση: python3 tools/make-mascots.py (απαιτεί Pillow)."""
from PIL import Image, ImageDraw, ImageFont
import os
S = 4; W, H = 200, 250
INK = (29, 42, 38, 255); CH = (255, 253, 243, 255); RED = (200, 16, 46, 255); GOLD = (246, 196, 83, 255); WHITE = (255, 255, 255, 255)
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'brand', 'mascot')
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 40 * S)
def bez(p0, p1, p2, n=40): return [((1-t)**2*p0[0]+2*(1-t)*t*p1[0]+t*t*p2[0], (1-t)**2*p0[1]+2*(1-t)*t*p1[1]+t*t*p2[1]) for t in [i/n for i in range(n+1)]]
def cub(p0, p1, p2, p3, n=40): return [((1-t)**3*p0[0]+3*(1-t)**2*t*p1[0]+3*(1-t)*t*t*p2[0]+t**3*p3[0], (1-t)**3*p0[1]+3*(1-t)**2*t*p1[1]+3*(1-t)*t*t*p2[1]+t**3*p3[1]) for t in [i/n for i in range(n+1)]]
def draw(mood, santa):
    img = Image.new('RGBA', (W*S, H*S), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    P = lambda x, y: (x*S, y*S)
    def thick(pts, w, col=INK):
        pp = [P(*p) for p in pts]; d.line(pp, fill=col, width=int(w*S), joint='curve'); r = w*S/2
        for x, y in (pp[0], pp[-1]): d.ellipse([x-r, y-r, x+r, y+r], fill=col)
    def ell(cx, cy, rx, ry, fill, outline=None, width=0): d.ellipse([(cx-rx)*S, (cy-ry)*S, (cx+rx)*S, (cy+ry)*S], fill=fill, outline=outline, width=int(width*S))
    def poly(pts, fill, outline=INK, w=4): d.polygon([P(*p) for p in pts], fill=fill); d.line([P(*p) for p in pts + [pts[0]]], fill=outline, width=int(w*S), joint='curve')
    def arm(pts):
        if santa: thick(pts, 11, INK); thick(pts, 7, RED)
        else: thick(pts, 6)
        ell(*pts[-1], 7, 7, CH, INK, 4)
    sh = Image.new('RGBA', img.size, (0, 0, 0, 0)); ImageDraw.Draw(sh).ellipse([50*S, 230*S, 150*S, 246*S], fill=(0, 0, 0, 40)); img = Image.alpha_composite(img, sh); d = ImageDraw.Draw(img)
    thick([(84, 200), (80, 228)], 6); thick([(116, 200), (120, 228)], 6); ell(75, 232, 12, 6, INK); ell(125, 232, 12, 6, INK)
    d.rounded_rectangle([58*S, 36*S, 142*S, 206*S], radius=30*S, fill=CH, outline=INK, width=5*S)
    d.line([P(*p) for p in bez((70, 62), (65, 120), (72, 176))], fill=(237, 229, 204, 255), width=7*S)
    d.rectangle([60*S, 152*S, 140*S, 182*S], fill=(31, 160, 255, 255)); d.line([P(58, 152), P(142, 152)], fill=INK, width=5*S); d.line([P(58, 182), P(142, 182)], fill=INK, width=5*S)
    d.line([P(70, 167), P(88, 167)], fill=(255, 255, 255, 210), width=3*S); d.line([P(96, 167), P(104, 167)], fill=(255, 255, 255, 210), width=3*S)
    if santa:
        coat = [(58, 132), (142, 132), (142, 176)] + bez((142, 176), (142, 206), (112, 206)) + [(88, 206)] + bez((88, 206), (58, 206), (58, 176))
        poly(coat, RED, INK, 5)
        d.rounded_rectangle([58*S, 193*S, 142*S, 208*S], radius=7*S, fill=WHITE, outline=INK, width=4*S)
        d.rounded_rectangle([94*S, 132*S, 106*S, 196*S], radius=3*S, fill=WHITE, outline=INK, width=3*S)
        d.rectangle([58*S, 150*S, 142*S, 166*S], fill=INK); d.rounded_rectangle([93*S, 147*S, 107*S, 169*S], radius=3*S, fill=GOLD, outline=INK, width=3*S)
    for cx in (74, 126): ell(cx, 118, 8, 8, (255, 159, 163, 165))
    if santa:
        beard = [(66, 108)] + bez((66, 108), (56, 140), (74, 164)) + bez((74, 164), (86, 182), (100, 184)) + bez((100, 184), (114, 182), (126, 164)) + bez((126, 164), (144, 140), (134, 108)) + bez((134, 108), (122, 128), (100, 128)) + bez((100, 128), (78, 128), (66, 108))
        poly(beard, WHITE, INK, 4)
        for cx in (89, 111): ell(cx, 114, 11, 7, WHITE, INK, 3)
    def eyes(ry=7, left=None, right=None):
        for cx, (rx, r) in ((84, left or (5, ry)), (116, right or (5, ry))): ell(cx, 98, rx, r, INK); ell(cx+1.6, 98-r/2.2, 2, 2, WHITE)
    def arcs():
        for cx in (84, 116): thick(bez((cx-7, 101), (cx, 90), (cx+7, 101)), 4)
    def smile(): thick(bez((88, 120), (100, 134), (112, 120)), 4)
    def openmouth(k=142):
        pts = bez((86, 118), (100, k), (114, 118)); d.polygon([P(*p) for p in pts], fill=(214, 69, 61, 255)); d.line([P(*p) for p in pts + [pts[0]]], fill=INK, width=4*S, joint='curve')
    L = bez((58, 120), (38, 132), (36, 158))
    if mood == 'happy': eyes(); smile(); arm(L); arm(bez((142, 120), (162, 132), (164, 158)))
    elif mood == 'wave': eyes(); openmouth(); arm(L); arm(bez((142, 112), (170, 98), (172, 62)))
    elif mood == 'celebrate':
        arcs(); openmouth(148); arm(bez((58, 112), (30, 94), (30, 56))); arm(bez((142, 112), (170, 94), (170, 56)))
        for (x, y, c) in ((20, 30, (255, 194, 31, 255)), (172, 24, (0, 200, 224, 255)), (100, 12, (229, 35, 27, 255)), (55, 18, (155, 44, 255, 255))): ell(x, y, 6, 6, c, INK, 2)
    elif mood == 'reading':
        eyes(ry=3.6); thick(bez((94, 124), (100, 129), (106, 124)), 4)
        d.rounded_rectangle([52*S, 146*S, 148*S, 210*S], radius=4*S, fill=WHITE, outline=INK, width=4*S); d.rectangle([60*S, 153*S, 140*S, 165*S], fill=(229, 35, 27, 255))
        for y in (175, 183, 191): d.line([P(60, y), P(98 if y < 190 else 90, y)], fill=(154, 165, 161, 255), width=3*S); d.line([P(106, y), P(140, y)], fill=(154, 165, 161, 255), width=3*S)
        arm(bez((58, 120), (40, 150), (56, 170))); arm(bez((142, 120), (160, 150), (144, 170)))
    elif mood == 'confused':
        eyes(left=(6.5, 8.5), right=(4, 5)); thick([(76, 84), (92, 89)], 4); thick([(108, 87), (124, 82)], 4)
        thick(bez((86, 127), (93, 119), (100, 127)) + bez((100, 127), (107, 135), (114, 127)), 4)
        arm(L); arm(bez((142, 118), (172, 100), (140, 66))); d.text(P(152, 2), '?', font=FONT, fill=(255, 194, 31, 255), stroke_width=2*S, stroke_fill=INK)
    elif mood == 'phone':
        eyes(); smile(); arm(L)
        ph = Image.new('RGBA', img.size, (0, 0, 0, 0)); pd = ImageDraw.Draw(ph); pd.rounded_rectangle([138*S, 128*S, 168*S, 178*S], radius=6*S, fill=(43, 47, 58, 255), outline=INK, width=3*S); pd.rectangle([142*S, 134*S, 164*S, 168*S], fill=(142, 227, 240, 255))
        for (x, y) in ((146, 138), (156, 138), (146, 148), (156, 156)): pd.rectangle([x*S, y*S, (x+6)*S, (y+6)*S], fill=INK)
        ph = ph.rotate(8, center=(152*S, 158*S)); img = Image.alpha_composite(img, ph); d = ImageDraw.Draw(img); arm(bez((142, 120), (166, 138), (150, 160)))
    elif mood == 'work':
        eyes(); thick(bez((90, 124), (100, 130), (110, 124)), 4); arm(L)
        thick([(170, 70), (184, 28)], 9, (154, 165, 173, 255)); ell(185, 24, 10, 10, None, (154, 165, 173, 255), 5); arm(bez((142, 118), (168, 112), (170, 74)))
        if not santa:
            hat = bez((60, 46), (100, -4), (140, 46)); d.polygon([P(*p) for p in hat], fill=(255, 194, 31, 255)); d.line([P(*p) for p in hat], fill=INK, width=5*S)
            d.rounded_rectangle([52*S, 42*S, 148*S, 53*S], radius=5*S, fill=(255, 194, 31, 255), outline=INK, width=5*S)
    elif mood == 'oops':
        eyes(); thick([(75, 90), (92, 83)], 4); thick([(108, 83), (125, 90)], 4); thick(bez((88, 131), (100, 119), (112, 131)), 4)
        d.polygon([P(*p) for p in bez((78, 110), (73, 119), (78, 122)) + bez((78, 122), (83, 119), (78, 110))], fill=(127, 211, 255, 255), outline=INK)
        arm(bez((58, 122), (46, 150), (50, 176))); arm(bez((142, 122), (154, 150), (150, 176)))
    if santa:
        poly(cub((60, 42), (62, 16), (96, 2), (128, 10)) + cub((128, 10), (146, 14), (156, 30), (148, 44)), RED, INK, 5)
        d.rounded_rectangle([52*S, 38*S, 148*S, 55*S], radius=8*S, fill=WHITE, outline=INK, width=4*S); ell(153, 46, 9, 9, WHITE, INK, 3.5)
    bb = img.getbbox(); img = img.crop((max(0, bb[0]-8*S), max(0, bb[1]-8*S), min(img.width, bb[2]+8*S), min(img.height, bb[3]+8*S)))
    return img.resize((int(img.width/S*1.5), int(img.height/S*1.5)), Image.LANCZOS)
os.makedirs(OUT, exist_ok=True)
for m in ['happy', 'wave', 'celebrate', 'reading', 'confused', 'phone', 'work', 'oops']:
    draw(m, False).save(f'{OUT}/{m}.png', optimize=True); draw(m, True).save(f'{OUT}/santa-{m}.png', optimize=True)
print('ok')

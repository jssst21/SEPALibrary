"""Builds a homepage button picture: photo on top, red rounded banner with icon + words.
Used by Claude to keep all picture buttons matching. Not part of the website itself.
Usage (python3): make_button(photo_path, out_path, lines, icon, photo_shift=0.0)
  lines: list of 1 or 2 text lines.  icon: 'calendar-check', 'calendar-clock', 'person-question'
  photo_shift: 0.0 = keep top of photo, 0.5 = center, 1.0 = keep bottom
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
FONT = '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'
S = 2
W, H = 720 * S, 480 * S
WHITE = (255, 255, 255)

def _icon(d, kind, cx, cy):
    lw = 7 * S
    if kind == 'person-question':
        d.ellipse((cx-22*S, cy-48*S, cx+22*S, cy-4*S), outline=WHITE, width=lw)
        d.arc((cx-46*S, cy+6*S, cx+46*S, cy+98*S), 180, 360, fill=WHITE, width=lw)
        d.line((cx-46*S+lw//2, cy+52*S, cx+46*S-lw//2, cy+52*S), fill=WHITE, width=lw)
    else:  # calendar
        d.rounded_rectangle((cx-50*S, cy-38*S, cx+38*S, cy+46*S), 8*S, outline=WHITE, width=lw)
        d.line((cx-50*S, cy-14*S, cx+38*S, cy-14*S), fill=WHITE, width=lw)
        for x in (cx-26*S, cx+14*S):
            d.line((x, cy-50*S, x, cy-28*S), fill=WHITE, width=lw)
        for r in range(2):
            for c in range(3):
                x, y = cx-36*S + c*20*S, cy + r*20*S
                d.rectangle((x, y-4*S, x+10*S, y+6*S), fill=WHITE)
    bx, by, br = cx+40*S, cy+30*S, 30*S
    d.ellipse((bx-br-6*S, by-br-6*S, bx+br+6*S, by+br+6*S), fill=(188, 10, 18))
    d.ellipse((bx-br, by-br, bx+br, by+br), outline=WHITE, width=lw)
    if kind == 'person-question':
        d.text((bx, by+2*S), '?', font=ImageFont.truetype(FONT, 38*S), fill=WHITE, anchor='mm')
    elif kind == 'calendar-check':
        d.line((bx-14*S, by, bx-4*S, by+11*S, bx+15*S, by-11*S), fill=WHITE, width=lw, joint='curve')
    else:  # clock
        d.line((bx, by-16*S, bx, by+2*S), fill=WHITE, width=lw)

def make_button(photo_path, out_path, lines, icon, photo_shift=0.0):
    src = Image.open(photo_path).convert('RGB')
    ph = 345 * S
    sc = max(W / src.width, ph / src.height)
    img = src.resize((round(src.width*sc), round(src.height*sc)), Image.LANCZOS)
    ox = (img.width - W) // 2
    oy = round((img.height - ph) * photo_shift)
    photo = img.crop((ox, oy, ox + W, oy + ph))
    canvas = Image.new('RGB', (W, H), 'white')
    canvas.paste(photo, (0, 0))
    x0, y0, x1, y1 = 8*S, 312*S, 712*S, 458*S
    r = (y1 - y0) // 2
    sh = Image.new('L', (W, H), 0)
    ImageDraw.Draw(sh).rounded_rectangle((x0, y0+6*S, x1, y1+6*S), r, fill=110)
    canvas.paste(Image.new('RGB', (W, H), (60, 0, 0)), (0, 0), sh.filter(ImageFilter.GaussianBlur(8*S)))
    ImageDraw.Draw(canvas).rounded_rectangle((x0-4*S, y0-4*S, x1+4*S, y1+4*S), r+4*S, fill='white')
    grad = Image.new('RGB', (W, H)); gd = ImageDraw.Draw(grad)
    for y in range(y0, y1 + 1):
        t = (y - y0) / (y1 - y0)
        gd.line([(0, y), (W, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip((206, 18, 28), (170, 6, 10))))
    mask = Image.new('L', (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle((x0, y0, x1, y1), r, fill=255)
    canvas.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(canvas)
    _icon(d, icon, 118*S, 385*S)
    tx, mid = 200*S, (y0 + y1)//2
    size = 62 if len(lines) == 1 else 50
    while True:
        f = ImageFont.truetype(FONT, size*S)
        if max(d.textlength(l, font=f) for l in lines) <= (x1 - 30*S) - tx: break
        size -= 2
    if len(lines) == 1:
        d.text((tx, mid + 4*S), lines[0], font=f, fill=WHITE, anchor='lm')
    else:
        gap = size * S * 0.58
        d.text((tx, mid - gap + 4*S), lines[0], font=f, fill=WHITE, anchor='lm')
        d.text((tx, mid + gap + 4*S), lines[1], font=f, fill=WHITE, anchor='lm')
    canvas.resize((720, 480), Image.LANCZOS).save(out_path, quality=85, optimize=True)

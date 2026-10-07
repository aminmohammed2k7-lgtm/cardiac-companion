#!/usr/bin/env python3
"""
Makes every Android icon from one drawing of the logo — run with:
    python3 tools/icons/make-icons.py        (needs Pillow)

The logo is v3.2's app icon: a dark green rounded square with a mint
heartbeat line. v3.2 carried it as PNG data inside index.html; the 192 px
copy was intact, but the 512 px and maskable copies were damaged (their
compressed data fails its checksum), so the line below was measured from
the 192 px copy and is drawn here as vectors, sharp at every size.

Writes, in android/app/src/main/res/:
  drawable/ic_launcher_foreground.xml   adaptive icon: the line (Android 8+)
  drawable/ic_launcher_monochrome.xml   themed icon (Android 13+)
  values/ic_launcher_background.xml     adaptive icon: the dark background
  mipmap-*/ic_launcher(_round).png      the whole icon for Android 7 (API 24-25)
  drawable/ic_stat_heartbeat.xml        notification icon, white on transparent
  drawable/splash_icon.xml              the logo on the launch screen
and tools/icons/icon-512.png, the store icon for Phase 8 (not shipped).
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')

BACKGROUND = '#0D1F1A'   # the dark square
LINE = '#3DDC97'         # the mint line
# The heartbeat line on the 192 x 192 icon: centre of the stroke, which is
# 9 units wide with round ends and corners. The square's corners are
# rounded with a radius of 40.
POINTS = [(28.5, 96), (55, 96), (71, 54.5), (96, 136.5), (113, 71.5), (125, 96), (162.5, 96)]
STROKE = 9
RADIUS = 40


def path(scale, dx, dy):
    """The line as vector path data, scaled and moved."""
    pts = ['%g,%g' % (round(dx + x * scale, 2), round(dy + y * scale, 2)) for x, y in POINTS]
    return 'M' + ' L'.join(pts)


def vector(size, body):
    return ('<?xml version="1.0" encoding="utf-8"?>\n'
            '<!-- Made by tools/icons/make-icons.py: edit that, not this. -->\n'
            '<vector xmlns:android="http://schemas.android.com/apk/res/android"\n'
            '    android:width="%ddp"\n    android:height="%ddp"\n'
            '    android:viewportWidth="%d"\n    android:viewportHeight="%d">\n%s</vector>\n'
            % (size, size, size, size, body))


def stroke(data, colour, width):
    return ('    <path\n        android:pathData="%s"\n        android:strokeColor="%s"\n'
            '        android:strokeWidth="%g"\n        android:strokeLineCap="round"\n'
            '        android:strokeLineJoin="round"\n        android:fillColor="#00000000" />\n'
            % (data, colour, round(width, 2)))


def write(rel, text):
    os.makedirs(os.path.dirname(os.path.join(RES, rel)), exist_ok=True)
    with open(os.path.join(RES, rel), 'w', encoding='utf-8') as f:
        f.write(text)


def adaptive():
    # Adaptive icons are 108 x 108 dp; launchers may crop to a circle 66 dp
    # across, so the line (143 units wide on the 192 icon) is drawn 60 dp
    # wide around the centre.
    s = 60 / 143.0
    data = path(s, 54 - 96 * s, 54 - 96 * s)
    write('drawable/ic_launcher_foreground.xml', vector(108, stroke(data, LINE, STROKE * s)))
    # Android 13 colours the themed icon itself; only the shape counts.
    write('drawable/ic_launcher_monochrome.xml', vector(108, stroke(data, '#FFFFFFFF', STROKE * s)))
    write('values/ic_launcher_background.xml',
          '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
          '    <color name="ic_launcher_background">%s</color>\n</resources>\n' % BACKGROUND)


def notification():
    # Status-bar icons are 24 dp, white on transparent; Android tints them.
    s = 0.14
    write('drawable/ic_stat_heartbeat.xml', vector(24, stroke(path(s, 12 - 96 * s, 12 - 96 * s), '#FFFFFFFF', 2)))


def splash():
    # The launch screen shows a 288 dp icon area, with what is drawn kept
    # inside a circle 192 dp across: the whole rounded square, 130 dp.
    s = 130 / 192.0
    o = 144 - 96 * s
    r = RADIUS * s
    square = ('    <path\n        android:fillColor="%s"\n        android:pathData="M%g,%g h%g a%g,%g 0 0 1 %g,%g v%g '
              'a%g,%g 0 0 1 -%g,%g h-%g a%g,%g 0 0 1 -%g,-%g v-%g a%g,%g 0 0 1 %g,-%g z" />\n'
              % (BACKGROUND, round(o + r, 2), round(o, 2), round(130 - 2 * r, 2), round(r, 2), round(r, 2), round(r, 2), round(r, 2),
                 round(130 - 2 * r, 2), round(r, 2), round(r, 2), round(r, 2), round(r, 2), round(130 - 2 * r, 2),
                 round(r, 2), round(r, 2), round(r, 2), round(r, 2), round(130 - 2 * r, 2), round(r, 2), round(r, 2), round(r, 2), round(r, 2)))
    write('drawable/splash_icon.xml', vector(288, square + stroke(path(s, o, o), LINE, STROKE * s)))


def png(size, shape):
    """The whole icon as a picture, drawn 4x larger and scaled down for smooth edges."""
    k = 4
    big = size * k
    im = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if shape == 'round':
        d.ellipse([0, 0, big - 1, big - 1], fill=BACKGROUND)
        s = big / 192.0 * 0.86   # a circle cuts the corners, so the line is drawn a little smaller
    elif shape == 'square':      # Google Play rounds the corners itself
        d.rectangle([0, 0, big - 1, big - 1], fill=BACKGROUND)
        s = big / 192.0
    else:
        d.rounded_rectangle([0, 0, big - 1, big - 1], radius=RADIUS * big / 192.0, fill=BACKGROUND)
        s = big / 192.0
    off = big / 2 - 96 * s
    pts = [(off + x * s, off + y * s) for x, y in POINTS]
    w = STROKE * s
    d.line(pts, fill=LINE, width=int(round(w)), joint='curve')
    for x, y in (pts[0], pts[-1]):
        d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=LINE)
    return im.resize((size, size), Image.LANCZOS)


def legacy():
    # Android 7 (API 24-25) has no adaptive icons: it uses these pictures.
    for name, size in [('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]:
        png(size, 'rounded').save(os.path.join(RES, 'mipmap-' + name, 'ic_launcher.png'), optimize=True)
        png(size, 'round').save(os.path.join(RES, 'mipmap-' + name, 'ic_launcher_round.png'), optimize=True)
    png(512, 'square').save(os.path.join(os.path.dirname(__file__), 'icon-512.png'), optimize=True)


if __name__ == '__main__':
    adaptive()
    notification()
    splash()
    legacy()
    print('icons written')

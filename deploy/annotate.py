"""Annotation helpers: highlight ellipse + arrow + optional label, using PIL only."""
import sys
from PIL import Image, ImageDraw, ImageFont

ORANGE = (242, 134, 29, 255)
RED = (220, 38, 38, 255)

def get_font(size):
    for name in ["arialbd.ttf", "Arial Bold.ttf", "arial.ttf", "DejaVuSans-Bold.ttf"]:
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default()

def draw_arrow(draw, start, end, color=ORANGE, width=6):
    draw.line([start, end], fill=color, width=width)
    import math
    angle = math.atan2(end[1]-start[1], end[0]-start[0])
    head_len = 22
    head_angle = math.radians(28)
    for sign in (1, -1):
        hx = end[0] - head_len * math.cos(angle - sign*head_angle)
        hy = end[1] - head_len * math.sin(angle - sign*head_angle)
        draw.line([end, (hx, hy)], fill=color, width=width)

def highlight_box(draw, box, color=ORANGE, width=5, radius=10):
    draw.rounded_rectangle(box, radius=radius, outline=color, width=width)

def add_label(img, draw, text, xy, color=ORANGE, size=26):
    font = get_font(size)
    bbox = draw.textbbox((0, 0), text, font=font)
    w, h = bbox[2]-bbox[0], bbox[3]-bbox[1]
    pad = 10
    box = [xy[0]-pad, xy[1]-pad, xy[0]+w+pad, xy[1]+h+pad]
    draw.rounded_rectangle(box, radius=8, fill=color)
    draw.text((xy[0], xy[1]-2), text, font=font, fill=(255, 255, 255, 255))

if __name__ == "__main__":
    pass

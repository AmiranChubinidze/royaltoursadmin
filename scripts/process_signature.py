"""Extract the blue ink signature from BlueInk.png.
The background is a SMOOTH gradient (light gray -> dark navy band) that shares the ink's
colour, so colour keying fails. The signature is the only HIGH-FREQUENCY content, so we
isolate it with a high-pass filter (grayscale minus a heavy gaussian blur). Soft alpha
ramp for anti-aliasing, uniform ink-navy colour, transparent background, cropped tight.
Output -> src/assets/signature-levani.png"""
from PIL import Image, ImageFilter
import numpy as np
import os

SRC = r"C:\Users\user\Desktop\BlueInk.png"
DST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "assets", "signature-levani.png"))
INK = (26, 42, 120)  # deep royal-blue pen ink

g = Image.open(SRC).convert("L")
gf = np.asarray(g).astype(np.float32)
blur = np.asarray(g.filter(ImageFilter.GaussianBlur(28))).astype(np.float32)
hp = np.abs(gf - blur)                       # ~0 on smooth bg, large on signature strokes

alpha = np.clip((hp - 5.0) / (20.0 - 5.0), 0.0, 1.0) ** 0.8   # soft ramp + lift faint tails
alpha255 = (alpha * 255).astype(np.uint8)

h, w = alpha.shape
rgba = np.zeros((h, w, 4), np.uint8)
rgba[..., 0] = INK[0]; rgba[..., 1] = INK[1]; rgba[..., 2] = INK[2]
rgba[..., 3] = alpha255
out = Image.fromarray(rgba, "RGBA")

ys, xs = np.where(alpha > 0.12)
pad = 18
minx, maxx = max(0, xs.min() - pad), min(w, xs.max() + pad + 1)
miny, maxy = max(0, ys.min() - pad), min(h, ys.max() + pad + 1)
out = out.crop((minx, miny, maxx, maxy))
out.save(DST)
print(f"kept={(alpha>0.12).mean()*100:.1f}% bbox=({minx},{miny},{maxx},{maxy}) cropped={out.size}")
print(f"saved -> {DST}")

# preview on white for verification
bg = Image.new("RGBA", out.size, (255, 255, 255, 255))
Image.alpha_composite(bg, out).convert("RGB").save(r"C:\Users\user\Desktop\sig_final_white.png")

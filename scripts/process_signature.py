"""Extract the blue ink signature from BlueInk.png as a SOLID, true-colour signature.

Background is a smooth gradient (light gray -> dark navy band) sharing the ink's colour,
so colour keying alone fails. Strategy:
  1. Locate the signature with a high-pass filter (smooth bg -> ~0, sharp ink -> strong).
  2. Threshold -> binary, morphological CLOSE to fill the hollow pen-stroke interiors.
  3. Drop texture-noise specks via connected-component size filtering (keep big strokes).
  4. Paint the mask with the REAL ink blue sampled from the source at FULL opacity
     (only a 1px boundary is anti-aliased) -> solid, no paleness, no hollow strokes.
Output -> src/assets/signature-levani.png (transparent PNG)."""
from PIL import Image, ImageFilter
import numpy as np
from collections import deque
import os

SRC = r"C:\Users\user\Desktop\BlueInk.png"
DST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "assets", "signature-levani.png"))
MIN_COMPONENT = 150   # px; smaller blobs are background texture noise (keeps the accent dot ~204px)

rgb = Image.open(SRC).convert("RGB")
arr = np.asarray(rgb).astype(np.float32)
r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
mx = arr.max(2); mn = arr.min(2)
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0.0)

gray = rgb.convert("L")
gf = np.asarray(gray).astype(np.float32)
blur = np.asarray(gray.filter(ImageFilter.GaussianBlur(28))).astype(np.float32)
hp = np.abs(gf - blur)

ink_sel = (hp > 8) & (sat > 0.5) & (b > 85)
ink = np.array([int(np.median(arr[..., c][ink_sel])) for c in range(3)], np.uint8)
print(f"ink colour = {tuple(int(x) for x in ink)}  ({int(ink_sel.sum())} sample px)")

# binary + morphological close to solidify outlined strokes
mask = Image.fromarray(((hp > 6).astype(np.uint8) * 255), "L")
for _ in range(3):
    mask = mask.filter(ImageFilter.MaxFilter(7))   # dilate
for _ in range(3):
    mask = mask.filter(ImageFilter.MinFilter(7))   # erode -> close
binary = np.asarray(mask) > 128

# connected components (8-connectivity), keep only large ones
H, W = binary.shape
labels = np.zeros((H, W), np.int32)
sizes = {}
cur = 0
ys, xs = np.nonzero(binary)
for y0, x0 in zip(ys.tolist(), xs.tolist()):
    if labels[y0, x0]:
        continue
    cur += 1
    cnt = 0
    dq = deque([(y0, x0)])
    labels[y0, x0] = cur
    while dq:
        y, x = dq.popleft()
        cnt += 1
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and binary[ny, nx] and not labels[ny, nx]:
                    labels[ny, nx] = cur
                    dq.append((ny, nx))
    sizes[cur] = cnt

top = sorted(sizes.values(), reverse=True)[:25]
print(f"components={len(sizes)}  top sizes={top}")
keep = {l for l, s in sizes.items() if s >= MIN_COMPONENT}
clean = np.isin(labels, list(keep))
print(f"kept {len(keep)} components, dropped {len(sizes) - len(keep)} specks")

# restore a touch of weight, anti-alias the boundary
m = Image.fromarray((clean.astype(np.uint8) * 255), "L")
m = m.filter(ImageFilter.MaxFilter(3))
m = m.filter(ImageFilter.GaussianBlur(0.8))
alpha = np.asarray(m).astype(np.uint8)

rgba = np.zeros((H, W, 4), np.uint8)
rgba[..., 0] = ink[0]; rgba[..., 1] = ink[1]; rgba[..., 2] = ink[2]
rgba[..., 3] = alpha
out = Image.fromarray(rgba, "RGBA")

yy, xx = np.where(alpha > 40)
pad = 18
minx, maxx = max(0, xx.min() - pad), min(W, xx.max() + pad + 1)
miny, maxy = max(0, yy.min() - pad), min(H, yy.max() + pad + 1)
out = out.crop((minx, miny, maxx, maxy))
out.save(DST)
print(f"cropped={out.size}  saved -> {DST}")

bgw = Image.new("RGBA", out.size, (255, 255, 255, 255))
Image.alpha_composite(bgw, out).convert("RGB").save(r"C:\Users\user\Desktop\sig_solid_white.png")

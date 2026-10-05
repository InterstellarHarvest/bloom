# BLOOM-027C evidence: join the per-angle globe crops written by `qa-sphere-validation.js --shots` (strip-<world>-<angle>.png)
# into one strip per world (cut at 60° left … centred … 60° right of the view centre), then remove the per-angle crops.
#   python3 docs/evidence/bloom-027c/compose-strips.py
import glob, os
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
ORDER = [("m60", "cut 60° left"), ("m30", "cut 30° left"), ("p0", "cut centred"), ("p30", "cut 30° right"), ("p60", "cut 60° right")]
for world in sorted({os.path.basename(p).split("-")[1] for p in glob.glob(os.path.join(HERE, "strip-*-*.png"))}):
    frames = [Image.open(os.path.join(HERE, f"strip-{world}-{k}.png")).convert("RGB") for k, _ in ORDER]
    w, h = frames[0].size
    out = Image.new("RGB", (w * len(frames), h + 22), (11, 14, 20)); d = ImageDraw.Draw(out)
    for i, (im, (_, label)) in enumerate(zip(frames, ORDER)):
        out.paste(im, (i * w, 22)); d.text((i * w + 8, 5), label, fill=(205, 214, 230))
    out.save(os.path.join(HERE, f"12-rotation-strip-{world}.png"))
    for k, _ in ORDER: os.remove(os.path.join(HERE, f"strip-{world}-{k}.png"))
    print("wrote", f"12-rotation-strip-{world}.png")

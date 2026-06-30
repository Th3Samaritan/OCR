"""Image preprocessing to lift OCR / handwriting accuracy.

The single biggest real-world lever for student-snapped answer sheets: fix
orientation, flatten contrast, denoise, sharpen. Pillow-only (no native deps).
Full deskew (rotation by detected angle) needs OpenCV — left as a follow-up.
"""
from __future__ import annotations

import io

from PIL import Image, ImageFilter, ImageOps


def _otsu_threshold(gray: Image.Image) -> int:
    hist = gray.histogram()[:256]
    total = sum(hist) or 1
    sum_all = sum(i * h for i, h in enumerate(hist))
    sum_bg = 0.0
    w_bg = 0
    best_t, best_var = 127, -1.0
    for t in range(256):
        w_bg += hist[t]
        if w_bg == 0:
            continue
        w_fg = total - w_bg
        if w_fg == 0:
            break
        sum_bg += t * hist[t]
        m_bg = sum_bg / w_bg
        m_fg = (sum_all - sum_bg) / w_fg
        var = w_bg * w_fg * (m_bg - m_fg) ** 2
        if var > best_var:
            best_var, best_t = var, t
    return best_t


def preprocess_image(data: bytes, filename: str = "", binarize: bool = False) -> bytes:
    """Return enhanced PNG bytes. Raises if the input isn't a parseable image."""
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)               # honour camera orientation
    img = img.convert("L")                            # grayscale
    img = ImageOps.autocontrast(img, cutoff=1)        # flatten lighting/shadows
    img = img.filter(ImageFilter.MedianFilter(size=3))  # denoise speckle
    img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=130, threshold=3))  # crisp strokes
    if binarize:
        t = _otsu_threshold(img)
        img = img.point(lambda p: 255 if p > t else 0)
    out = io.BytesIO()
    img.save(out, "PNG")
    return out.getvalue()

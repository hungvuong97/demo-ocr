import io
from typing import List

import fitz
from PIL import Image


def pdf_to_images(pdf_bytes: bytes, dpi: int = 200) -> List[Image.Image]:
    """Convert PDF to list of PIL Images using PyMuPDF (no poppler required)."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    images: List[Image.Image] = []
    try:
        for i in range(len(doc)):
            page = doc.load_page(i)
            mat = fitz.Matrix(dpi / 72, dpi / 72)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img = Image.frombytes(
                "RGB",
                [pix.width, pix.height],
                pix.samples,
            )
            images.append(img)
    finally:
        doc.close()
    return images

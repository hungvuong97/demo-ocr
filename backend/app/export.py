import io
from typing import Literal

from docx import Document
from docx.shared import Pt
from markdown import markdown

Format = Literal["html", "markdown", "doc"]


def to_html(md: str) -> str:
    return markdown(
        md,
        extensions=["extra", "codehilite", "tables", "toc"],
        extension_configs={"codehilite": {"css_class": "highlight"}},
    )


def to_docx(md: str) -> bytes:
    doc = Document()
    for line in md.split("\n"):
        line = line.strip()
        if not line:
            continue
        p = doc.add_paragraph()
        p.add_run(line).font.size = Pt(11)
    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()

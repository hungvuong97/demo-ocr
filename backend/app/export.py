import io
from typing import Literal

from docx import Document
from markdown import markdown
from htmldocx import HtmlToDocx

Format = Literal["html", "markdown", "doc"]


def to_html(md: str) -> str:
    return markdown(
        md,
        extensions=["extra", "codehilite", "tables", "toc"],
        extension_configs={"codehilite": {"css_class": "highlight"}},
    )


def to_docx(md: str) -> bytes:
    """
    Chuyển Markdown (có thể chứa cả HTML như bảng) -> HTML -> DOCX.
    Nhờ htmldocx để giữ được heading, in đậm, bảng, danh sách... gần giống bản gốc nhất.
    """
    html = to_html(md)

    document = Document()
    parser = HtmlToDocx()
    parser.add_html_to_document(html, document)

    buf = io.BytesIO()
    document.save(buf)
    buf.seek(0)
    return buf.read()

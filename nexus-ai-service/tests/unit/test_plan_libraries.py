import base64
import sys
import types

from nexus_ai_service.rag.extraction import ExtractorRegistry
from nexus_ai_service.rag.schemas import FileSource


def test_pdf_extractor_uses_opendataloader_before_pypdf(monkeypatch) -> None:
    calls = []

    module = types.ModuleType("opendataloader_pdf")

    def convert(**kwargs):
        calls.append(kwargs)
        return {"markdown": "OpenDataLoader extracted text", "json": {"kids": [{"type": "paragraph", "text": "A"}]}}

    module.convert = convert
    monkeypatch.setitem(sys.modules, "opendataloader_pdf", module)

    source = FileSource(
        id="file-1",
        workspace_id="ws-1",
        name="demo.pdf",
        mime_type="application/pdf",
        content_base64=base64.b64encode(b"%PDF fake").decode("ascii"),
    )

    document = ExtractorRegistry(opendataloader_options={"hybrid": "off"}).extract(source)

    assert calls
    assert calls[0]["format"] == "json,markdown"
    assert calls[0]["hybrid"] == "off"
    assert document.text == "OpenDataLoader extracted text"
    assert document.metadata["extractor"] == "opendataloader_pdf"


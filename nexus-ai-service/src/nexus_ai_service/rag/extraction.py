import json
import tempfile
from io import BytesIO
from pathlib import Path
from typing import Any

from nexus_ai_service.integrations.backend_client import decode_file_source
from nexus_ai_service.rag.schemas import ExtractedDocument, ExtractedElement, FileSource


class ExtractorRegistry:
    def __init__(self, opendataloader_options: dict[str, Any] | None = None) -> None:
        self.opendataloader_options = opendataloader_options or {}

    def extract(self, source: FileSource) -> ExtractedDocument:
        content = decode_file_source(source)
        mime_type = (source.mime_type or "").lower()
        filename = source.name.lower()
        if mime_type == "application/pdf" or filename.endswith(".pdf"):
            return self._extract_pdf(content, source)
        return self._extract_text(content, source)

    def _extract_text(self, content: bytes, source: FileSource) -> ExtractedDocument:
        text = content.decode("utf-8", errors="replace")
        if not text.strip():
            text = str(source.metadata.get("text") or source.metadata.get("markdown") or "")
        elements = [
            ExtractedElement(type="paragraph", content=paragraph.strip())
            for paragraph in text.split("\n\n")
            if paragraph.strip()
        ]
        return ExtractedDocument(text=text, markdown=text, elements=elements, metadata={"extractor": "text"})

    def _extract_pdf(self, content: bytes, source: FileSource) -> ExtractedDocument:
        try:
            return self._extract_pdf_with_opendataloader(content, source)
        except Exception:
            return self._extract_pdf_with_pypdf(content, source)

    def _extract_pdf_with_opendataloader(self, content: bytes, source: FileSource) -> ExtractedDocument:
        import opendataloader_pdf

        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            input_path = tmp_path / (source.name or "document.pdf")
            input_path.write_bytes(content)
            result = opendataloader_pdf.convert(
                input_path=str(input_path),
                output_dir=str(tmp_path),
                format="json,markdown",
                quiet=True,
                **self.opendataloader_options,
            )
            if result is None:
                result = self._read_opendataloader_outputs(tmp_path)
        return self._normalize_opendataloader_result(result, source)

    def _extract_pdf_with_pypdf(self, content: bytes, source: FileSource) -> ExtractedDocument:
        try:
            from pypdf import PdfReader
        except Exception:
            return self._extract_text(content, source)

        reader = PdfReader(BytesIO(content))
        elements: list[ExtractedElement] = []
        page_texts: list[str] = []
        for index, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if not text.strip():
                continue
            page_texts.append(text)
            elements.append(ExtractedElement(type="text", content=text, page_number=index + 1))
        combined = "\n\n".join(page_texts)
        return ExtractedDocument(text=combined, markdown=None, elements=elements, metadata={"extractor": "pypdf"})

    def _read_opendataloader_outputs(self, output_dir: Path) -> dict[str, Any]:
        data: dict[str, Any] = {}
        markdown_files = sorted(output_dir.glob("*.md")) + sorted(output_dir.glob("*.markdown"))
        json_files = sorted(output_dir.glob("*.json"))
        if markdown_files:
            data["markdown"] = markdown_files[0].read_text(encoding="utf-8", errors="replace")
        if json_files:
            raw = json_files[0].read_text(encoding="utf-8", errors="replace")
            try:
                data["json"] = json.loads(raw)
            except json.JSONDecodeError:
                data["text"] = raw
        return data

    def _normalize_opendataloader_result(self, result: Any, source: FileSource) -> ExtractedDocument:
        if hasattr(result, "model_dump"):
            result = result.model_dump()
        if isinstance(result, str):
            return ExtractedDocument(text=result, markdown=result, metadata={"extractor": "opendataloader_pdf"})
        if not isinstance(result, dict):
            text = str(result)
            return ExtractedDocument(text=text, markdown=text, metadata={"extractor": "opendataloader_pdf"})

        payload = result.get("json") if isinstance(result.get("json"), dict) else result
        markdown = first_string(result, ("markdown", "md", "text", "content")) or first_string(
            payload, ("markdown", "md", "text", "content")
        )
        elements = self._elements_from_payload(payload)
        text = markdown or "\n\n".join(element.content for element in elements)
        return ExtractedDocument(
            text=text,
            markdown=markdown,
            elements=elements,
            metadata={
                "extractor": "opendataloader_pdf",
                "file_name": source.name,
                "raw_keys": list(result.keys()),
            },
        )

    def _elements_from_payload(self, payload: dict[str, Any]) -> list[ExtractedElement]:
        elements: list[ExtractedElement] = []
        stack = list(payload.get("kids") or payload.get("elements") or payload.get("pages") or payload.get("blocks") or [])
        while stack:
            item = stack.pop(0)
            if hasattr(item, "model_dump"):
                item = item.model_dump()
            if not isinstance(item, dict):
                continue
            content = first_string(item, ("content", "text", "markdown"))
            if content:
                elements.append(
                    ExtractedElement(
                        type=str(item.get("type") or item.get("category") or "text"),
                        content=content,
                        page_number=page_number(item),
                        bbox=bbox(item),
                        metadata={key: value for key, value in item.items() if key not in {"kids", "children"}},
                    )
                )
            children = item.get("kids") or item.get("children") or []
            if isinstance(children, list):
                stack.extend(children)
        return elements


def first_string(data: dict[str, Any], keys: tuple[str, ...]) -> str | None:
    for key in keys:
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return None


def page_number(data: dict[str, Any]) -> int | None:
    value = data.get("page_number") or data.get("page") or data.get("pageIndex")
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def bbox(data: dict[str, Any]) -> list[float] | None:
    value = data.get("bbox") or data.get("bounding_box") or data.get("bounding box")
    if not isinstance(value, list):
        return None
    try:
        return [float(item) for item in value]
    except (TypeError, ValueError):
        return None

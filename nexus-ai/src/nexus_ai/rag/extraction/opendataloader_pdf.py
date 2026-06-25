from __future__ import annotations

import importlib
import inspect
import json
import tempfile
from pathlib import Path
from typing import Any

from nexus_ai.rag.extraction.base import DocumentExtractor
from nexus_ai.rag.schemas import ExtractedDocument, ExtractedElement, FileSource


class OpenDataLoaderPdfExtractor(DocumentExtractor):
    async def extract(self, source: FileSource, content: bytes) -> ExtractedDocument:
        if source.mime_type not in {"application/pdf", "application/x-pdf"} and not source.name.lower().endswith(".pdf"):
            raise ValueError(f"OpenDataLoader PDF extractor only supports PDF files: {source.mime_type}")

        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / source.name
            path.write_bytes(content)
            result = await self._convert(path, Path(tmp_dir))
        return self._normalize_result(result, source)

    async def _convert(self, path: Path, output_dir: Path) -> Any:
        module = importlib.import_module("opendataloader_pdf")
        converter = self._resolve_converter(module)
        result = converter(str(path), output_dir=str(output_dir), format=["json", "markdown"], quiet=True)
        if inspect.isawaitable(result):
            result = await result
        return result if result is not None else self._read_outputs(output_dir)

    def _resolve_converter(self, module: Any) -> Any:
        for name in ("convert", "load", "parse"):
            converter = getattr(module, name, None)
            if callable(converter):
                return converter
        for name in ("OpenDataLoader", "PDFLoader", "PdfLoader"):
            cls = getattr(module, name, None)
            if cls is None:
                continue
            instance = cls()
            for method_name in ("convert", "load", "parse"):
                method = getattr(instance, method_name, None)
                if callable(method):
                    return method
        raise RuntimeError("opendataloader-pdf is installed but no supported convert/load/parse API was found")

    def _read_outputs(self, output_dir: Path) -> dict[str, Any]:
        data: dict[str, Any] = {}
        markdown_files = sorted(output_dir.glob("*.md")) + sorted(output_dir.glob("*.markdown"))
        json_files = sorted(output_dir.glob("*.json"))
        if markdown_files:
            data["markdown"] = markdown_files[0].read_text(encoding="utf-8", errors="replace")
        if json_files:
            try:
                data["json"] = json.loads(json_files[0].read_text(encoding="utf-8", errors="replace"))
            except json.JSONDecodeError:
                data["text"] = json_files[0].read_text(encoding="utf-8", errors="replace")
        if not data:
            text_files = sorted(output_dir.glob("*.txt"))
            if text_files:
                data["text"] = text_files[0].read_text(encoding="utf-8", errors="replace")
        return data

    def _normalize_result(self, result: Any, source: FileSource) -> ExtractedDocument:
        if isinstance(result, str):
            return ExtractedDocument(text=result, markdown=result, metadata={"file_name": source.name})

        if hasattr(result, "model_dump"):
            result = result.model_dump()
        elif hasattr(result, "dict"):
            result = result.dict()

        if isinstance(result, dict):
            nested_json = result.get("json") if isinstance(result.get("json"), dict) else {}
            markdown = self._first_string(result, ("markdown", "md", "text", "content")) or self._first_string(
                nested_json, ("markdown", "md", "text", "content")
            )
            elements = self._extract_elements(nested_json or result)
            text = markdown or "\n\n".join(element.content for element in elements)
            return ExtractedDocument(
                text=text,
                markdown=markdown,
                elements=elements,
                metadata={"file_name": source.name, "raw_keys": list(result.keys())},
            )

        text = str(result)
        return ExtractedDocument(text=text, markdown=text, metadata={"file_name": source.name})

    def _first_string(self, data: dict[str, Any], keys: tuple[str, ...]) -> str | None:
        for key in keys:
            value = data.get(key)
            if isinstance(value, str) and value.strip():
                return value
        return None

    def _extract_elements(self, data: dict[str, Any]) -> list[ExtractedElement]:
        raw_elements = data.get("elements") or data.get("pages") or data.get("blocks") or []
        elements: list[ExtractedElement] = []
        if not isinstance(raw_elements, list):
            return elements
        for item in raw_elements:
            if hasattr(item, "model_dump"):
                item = item.model_dump()
            if not isinstance(item, dict):
                continue
            content = self._first_string(item, ("content", "text", "markdown"))
            if not content:
                continue
            page = item.get("page_number") or item.get("page") or item.get("pageIndex")
            elements.append(
                ExtractedElement(
                    type=str(item.get("type") or item.get("category") or "text"),
                    content=content,
                    page_number=int(page) if isinstance(page, (int, float, str)) and str(page).isdigit() else None,
                    bbox=item.get("bbox") if isinstance(item.get("bbox"), list) else None,
                    metadata={k: v for k, v in item.items() if k not in {"content", "text", "markdown", "bbox"}},
                )
            )
        return elements

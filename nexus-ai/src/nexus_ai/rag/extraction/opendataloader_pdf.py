from __future__ import annotations

import importlib
import inspect
import json
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from nexus_ai.rag.extraction.base import DocumentExtractor
from nexus_ai.rag.schemas import ExtractedDocument, ExtractedElement, FileSource
from nexus_ai.settings import Settings


class OpenDataLoaderPdfExtractor(DocumentExtractor):
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings

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
        kwargs = {
            "input_path": str(path),
            "output_dir": str(output_dir),
            "format": "json,markdown",
            "quiet": True,
        }
        if self.settings is not None:
            hybrid_mode = self.settings.rag_opendataloader_hybrid
            kwargs.update(
                {
                    "use_struct_tree": self.settings.rag_opendataloader_use_struct_tree,
                    "table_method": self.settings.rag_opendataloader_table_method,
                    "reading_order": self.settings.rag_opendataloader_reading_order,
                    "markdown_with_html": self.settings.rag_opendataloader_markdown_with_html,
                    "include_header_footer": self.settings.rag_opendataloader_include_header_footer,
                    "detect_strikethrough": self.settings.rag_opendataloader_detect_strikethrough,
                    "hybrid": self.settings.rag_opendataloader_hybrid,
                    "hybrid_mode": self.settings.rag_opendataloader_hybrid_mode,
                    "hybrid_timeout": self.settings.rag_opendataloader_hybrid_timeout,
                    "hybrid_fallback": self.settings.rag_opendataloader_hybrid_fallback,
                }
            )
            if hybrid_mode == "off":
                kwargs["threads"] = self.settings.rag_opendataloader_threads
            if hybrid_mode == "hancom-ai":
                kwargs["hybrid_hancom_ai_regionlist_strategy"] = (
                    self.settings.rag_opendataloader_hybrid_hancom_ai_regionlist_strategy
                )
                kwargs["hybrid_hancom_ai_ocr_strategy"] = self.settings.rag_opendataloader_hybrid_hancom_ai_ocr_strategy
                kwargs["hybrid_hancom_ai_image_cache"] = self.settings.rag_opendataloader_hybrid_hancom_ai_image_cache
            if self.settings.rag_opendataloader_hybrid_url:
                kwargs["hybrid_url"] = self.settings.rag_opendataloader_hybrid_url
        try:
            result = converter(**kwargs)
        except subprocess.CalledProcessError as exc:
            detail = (exc.stdout or exc.stderr or exc.output or "").strip()
            message = "opendataloader-pdf convert() failed"
            if detail:
                message = f"{message}: {detail}"
            raise RuntimeError(message) from exc
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
                metadata={
                    "file_name": source.name,
                    "raw_keys": list(result.keys()),
                    "number_of_pages": (nested_json or result).get("number of pages"),
                    "title": (nested_json or result).get("title"),
                    "author": (nested_json or result).get("author"),
                },
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
        elements: list[ExtractedElement] = []
        raw_elements = data.get("kids") or data.get("elements") or data.get("pages") or data.get("blocks") or []
        self._walk_elements(raw_elements, elements)
        return elements

    def _walk_elements(self, raw_elements: Any, output: list[ExtractedElement]) -> None:
        if not isinstance(raw_elements, list):
            return
        for item in raw_elements:
            if hasattr(item, "model_dump"):
                item = item.model_dump()
            if not isinstance(item, dict):
                continue

            content = self._first_string(item, ("content", "text", "markdown"))
            page = self._page_number(item)
            bbox = self._bounding_box(item)
            item_type = str(item.get("type") or item.get("category") or "text")

            if content:
                output.append(
                    ExtractedElement(
                        type=item_type,
                        content=content,
                        page_number=page,
                        bbox=bbox,
                        metadata={
                            k: v
                            for k, v in item.items()
                            if k not in {"content", "text", "markdown", "bbox", "bounding box", "kids", "list items", "rows"}
                        },
                    )
                )

            nested_children = item.get("kids")
            if isinstance(nested_children, list):
                self._walk_elements(nested_children, output)

            list_items = item.get("list items")
            if isinstance(list_items, list):
                self._walk_elements(list_items, output)

            rows = item.get("rows")
            if isinstance(rows, list):
                self._walk_table_rows(rows, page, output)

    def _walk_table_rows(self, rows: list[Any], default_page: int | None, output: list[ExtractedElement]) -> None:
        for row in rows:
            if hasattr(row, "model_dump"):
                row = row.model_dump()
            if not isinstance(row, dict):
                continue
            for cell in row.get("cells", []):
                if hasattr(cell, "model_dump"):
                    cell = cell.model_dump()
                if not isinstance(cell, dict):
                    continue
                content = self._first_string(cell, ("content", "text", "markdown"))
                if content:
                    output.append(
                        ExtractedElement(
                            type="table cell",
                            content=content,
                            page_number=self._page_number(cell) or default_page,
                            bbox=self._bounding_box(cell),
                            metadata={k: v for k, v in cell.items() if k not in {"content", "text", "markdown", "bounding box", "kids"}},
                        )
                    )
                self._walk_elements(cell.get("kids"), output)

    def _page_number(self, item: dict[str, Any]) -> int | None:
        for key in ("page number", "page_number", "page", "pageIndex"):
            value = item.get(key)
            if isinstance(value, int):
                return value
            if isinstance(value, str) and value.isdigit():
                return int(value)
        return None

    def _bounding_box(self, item: dict[str, Any]) -> list[float] | None:
        bbox = item.get("bounding box")
        if isinstance(bbox, list):
            return [float(value) for value in bbox]
        bbox = item.get("bbox")
        if isinstance(bbox, list):
            return [float(value) for value in bbox]
        return None

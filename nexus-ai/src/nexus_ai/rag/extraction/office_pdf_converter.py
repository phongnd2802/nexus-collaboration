from __future__ import annotations

import asyncio
import os
import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path

from nexus_ai.rag.schemas import FileSource
from nexus_ai.settings import Settings


@dataclass(frozen=True)
class OfficePdfConversionResult:
    pdf_bytes: bytes
    metadata: dict[str, object]


class LibreOfficePdfConverter:
    SUPPORTED_EXTENSIONS = {".docx", ".pptx", ".xlsx"}
    SUPPORTED_MIME_TYPES = {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def supports(self, source: FileSource) -> bool:
        suffix = Path(source.name).suffix.lower()
        return suffix in self.SUPPORTED_EXTENSIONS or (source.mime_type or "").lower() in self.SUPPORTED_MIME_TYPES

    async def convert(self, source: FileSource, content: bytes) -> OfficePdfConversionResult:
        if not self.supports(source):
            raise ValueError(f"Unsupported Office file type for PDF normalization: {source.mime_type or source.name}")

        soffice_path = self._resolve_soffice_path()
        if not soffice_path:
            raise RuntimeError("LibreOffice headless is not available for Office-to-PDF normalization")

        with tempfile.TemporaryDirectory() as tmp_dir:
            work_dir = Path(tmp_dir)
            input_path = work_dir / source.name
            input_path.write_bytes(content)
            output_dir = work_dir / "converted"
            output_dir.mkdir(parents=True, exist_ok=True)

            proc = await asyncio.create_subprocess_exec(
                soffice_path,
                "--headless",
                "--nologo",
                "--nolockcheck",
                "--nodefault",
                "--norestore",
                "--convert-to",
                "pdf",
                "--outdir",
                str(output_dir),
                str(input_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=self._conversion_env(work_dir),
            )
            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=max(1, self.settings.rag_office_conversion_timeout_seconds),
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.communicate()
                raise RuntimeError("LibreOffice conversion timed out")

            if proc.returncode != 0:
                detail = (stderr or stdout or b"").decode("utf-8", errors="replace").strip()
                message = "LibreOffice conversion failed"
                if detail:
                    message = f"{message}: {detail}"
                raise RuntimeError(message)

            pdf_path = output_dir / f"{input_path.stem}.pdf"
            if not pdf_path.exists():
                raise RuntimeError("LibreOffice conversion did not produce a PDF output")

            return OfficePdfConversionResult(
                pdf_bytes=pdf_path.read_bytes(),
                metadata={
                    "source_format": self._source_format(source),
                    "original_mime_type": source.mime_type,
                    "normalized_mime_type": "application/pdf",
                    "normalization_strategy": "office_to_pdf",
                    "conversion_engine": "libreoffice",
                    "page_equivalence_mode": "canonical_pdf",
                    "normalized_filename": pdf_path.name,
                },
            )

    def _resolve_soffice_path(self) -> str | None:
        configured = (self.settings.rag_libreoffice_path or "").strip()
        if configured:
            return configured if Path(configured).exists() else None
        return shutil.which("soffice") or shutil.which("libreoffice")

    def _conversion_env(self, work_dir: Path) -> dict[str, str]:
        env = os.environ.copy()
        env.setdefault("HOME", str(work_dir))
        env.setdefault("TMPDIR", str(work_dir))
        return env

    def _source_format(self, source: FileSource) -> str:
        suffix = Path(source.name).suffix.lower()
        if suffix == ".docx":
            return "docx"
        if suffix == ".pptx":
            return "pptx"
        if suffix == ".xlsx":
            return "xlsx"
        mime_type = (source.mime_type or "").lower()
        if "wordprocessingml" in mime_type:
            return "docx"
        if "presentationml" in mime_type:
            return "pptx"
        if "spreadsheetml" in mime_type:
            return "xlsx"
        return "office"

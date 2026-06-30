import hashlib
import re

from nexus_ai_service.rag.schemas import ChildChunk, ExtractedDocument, FileSource, ParentChunk


class ChunkingService:
    def __init__(
        self,
        parent_chars: int = 6000,
        child_chars: int = 1800,
        overlap_chars: int = 240,
        tokenizer_model: str | None = None,
    ) -> None:
        self.parent_chars = parent_chars
        self.child_chars = child_chars
        self.overlap_chars = overlap_chars
        self.tokenizer = self._load_tokenizer(tokenizer_model)

    def split(self, source: FileSource, document: ExtractedDocument) -> list[ChildChunk]:
        parents = self._parents(source, document)
        children: list[ChildChunk] = []
        for parent in parents:
            start = 0
            chunk_index = 0
            while start < len(parent.text):
                end = min(len(parent.text), start + self.child_chars)
                text = parent.text[start:end].strip()
                if text:
                    child_id = stable_chunk_id(source.workspace_id, source.id, parent.id, chunk_index, text)
                    children.append(
                        ChildChunk(
                            id=child_id,
                            parent_id=parent.id,
                            text=text,
                            chunk_index=len(children),
                            heading_path=parent.heading_path,
                            metadata=parent.metadata,
                        )
                    )
                    chunk_index += 1
                if end == len(parent.text):
                    break
                start = max(0, end - self.overlap_chars)
        return children

    def _parents(self, source: FileSource, document: ExtractedDocument) -> list[ParentChunk]:
        blocks = [block.strip() for block in re.split(r"\n{2,}", document.text) if block.strip()]
        parents: list[ParentChunk] = []
        current: list[str] = []
        for block in blocks or [document.text]:
            next_text = "\n\n".join([*current, block]).strip()
            if current and len(next_text) > self.parent_chars:
                parent_text = "\n\n".join(current)
                parents.append(self._parent(source, parent_text, len(parents), document))
                current = [block]
            else:
                current.append(block)
        if current:
            parents.append(self._parent(source, "\n\n".join(current), len(parents), document))
        return parents

    def _parent(self, source: FileSource, text: str, index: int, document: ExtractedDocument) -> ParentChunk:
        digest = hashlib.sha256(f"{source.workspace_id}:{source.id}:{index}:{text[:256]}".encode()).hexdigest()[:24]
        return ParentChunk(
            id=digest,
            text=text,
            metadata={"file_id": source.id, "title": source.name, "extractor": document.metadata.get("extractor")},
        )

    def token_count(self, text: str) -> int:
        if self.tokenizer is not None:
            return len(self.tokenizer.encode(text))
        return max(1, len(text) // 4)

    def _load_tokenizer(self, tokenizer_model: str | None):
        if not tokenizer_model:
            return None
        try:
            from transformers import AutoTokenizer

            return AutoTokenizer.from_pretrained(tokenizer_model)
        except Exception:
            return None


def stable_chunk_id(workspace_id: str, file_id: str, parent_id: str, chunk_index: int, text: str) -> str:
    value = f"{workspace_id}:{file_id}:{parent_id}:{chunk_index}:{text[:256]}"
    return hashlib.sha256(value.encode()).hexdigest()[:32]

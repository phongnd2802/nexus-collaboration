from nexus_ai_service.memory.schemas import MemoryWriteRequest


class MemoryPolicy:
    def should_store(self, request: MemoryWriteRequest) -> bool:
        text = request.text.strip()
        if len(text) < 12:
            return False
        lowered = text.lower()
        allowed_markers = ["prefer", "preference", "remember", "convention", "always", "usually"]
        return any(marker in lowered for marker in allowed_markers)


from __future__ import annotations

from nexus_ai.agent import build_runtime
from nexus_ai.settings import load_settings


def main() -> None:
    settings = load_settings()
    runtime = build_runtime(settings)
    print("Nexus AI configuration OK")
    print(f"model={settings.model}")
    print(f"workspace_id={settings.workspace_id}")
    print(f"mcp_url={settings.mcp_url}")
    print(f"sqlite_path={settings.sqlite_path}")
    if runtime.capability_warnings:
        print("Capability warnings:")
        for warning in runtime.capability_warnings:
            print(f"- {warning}")


if __name__ == "__main__":
    main()


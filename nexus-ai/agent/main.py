from pathlib import Path
import os

from dotenv import load_dotenv
from langfuse import get_client
from pydantic_ai import Agent
from pydantic_ai_harness import FileSystem


ROOT_DIR = Path(__file__).resolve().parent.parent
WORKSPACE_DIR = ROOT_DIR / "workspace"

load_dotenv()

if os.environ.get("LANGFUSE_BASE_URL") and not os.environ.get("LANGFUSE_HOST"):
    os.environ["LANGFUSE_HOST"] = os.environ["LANGFUSE_BASE_URL"]


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


for required_name in (
    "OPENROUTER_API_KEY",
    "NEXUS_USER_ACCESS_TOKEN",
    "NEXUS_WORKSPACE_ID",
    "LANGFUSE_PUBLIC_KEY",
    "LANGFUSE_SECRET_KEY",
    "LANGFUSE_HOST",
):
    require_env(required_name)


if not WORKSPACE_DIR.exists():
    raise RuntimeError(f"Workspace directory does not exist: {WORKSPACE_DIR}")


langfuse = get_client()
if not langfuse.auth_check():
    raise RuntimeError("Langfuse authentication failed. Check Langfuse environment variables.")


Agent.instrument_all()

model_name = os.environ.get("OPENROUTER_MODEL", "anthropic/claude-sonnet-4.6")

agent = Agent(
    f"openrouter:{model_name}",
    capabilities=[
        FileSystem(
            root_dir=WORKSPACE_DIR,
            denied_patterns=["*__pycache__*"],
            protected_patterns=[
                "servers/*.py",
            ],
            max_read_lines=500,
            max_search_results=200,
            max_find_results=200,
        )
    ],
)

app = agent.to_web()

from typing import Any

import anyio
from mcp.server import Server
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Mount, Route

from .config import settings
from .tools.registry import call_tool, list_tool_definitions

mcp_server = Server(settings.mcp_server_name)


@mcp_server.list_tools()
async def list_tools():  # type: ignore[misc]
    return list_tool_definitions()


@mcp_server.call_tool()
async def dispatch_tool(name: str, arguments: dict[str, Any]):  # type: ignore[misc]
    return await call_tool(name, arguments)


async def health(_request) -> JSONResponse:
    return JSONResponse({"status": "ok", "server": settings.mcp_server_name})


def _create_mcp_binding(server: Server[Any]):
    try:
        from mcp.server.streamable_http import StreamableHTTPSessionManager
    except ImportError:
        from mcp.server.streamable_http import StreamableHTTPServerTransport

        transport = StreamableHTTPServerTransport(
            mcp_session_id=None,
            is_json_response_enabled=False,
        )

        async def run_transport() -> None:
            async with transport.connect() as (read_stream, write_stream):
                await server.run(
                    read_stream,
                    write_stream,
                    server.create_initialization_options(),
                    stateless=True,
                )

        class _Binding:
            app = transport.handle_request

            @staticmethod
            def start(task_group: anyio.abc.TaskGroup):
                task_group.start_soon(run_transport)
                return task_group.cancel_scope

        return _Binding()

    session_manager = StreamableHTTPSessionManager(app=server, stateless=True)

    class _Binding:
        app = session_manager.handle_request

        @staticmethod
        def start(_task_group: anyio.abc.TaskGroup):
            return None

    return _Binding()


mcp_binding = _create_mcp_binding(mcp_server)


async def lifespan(_app: Starlette):
    async with anyio.create_task_group() as task_group:
        cancel_scope = mcp_binding.start(task_group)
        try:
            yield
        finally:
            if cancel_scope:
                cancel_scope.cancel()


app = Starlette(
    routes=[
        Route("/health", endpoint=health),
        Mount("/mcp", app=mcp_binding.app),
    ],
    lifespan=lifespan,
)

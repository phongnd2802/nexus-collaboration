import asyncio
import os
import sys
import json
from contextlib import AsyncExitStack
from typing import Optional, List


from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from langchain_mcp_adapters.tools import load_mcp_tools
from langgraph.prebuilt import create_react_agent
from langchain_google_genai import ChatGoogleGenerativeAI

from dotenv import load_dotenv


load_dotenv()

class CustomEncoder(json.JSONEncoder):
    def default(self, o):
        if hasattr(o, "content"):
            return {"type": o.__class__.__name__, "content": o.content}
        return super().default(o)


llm = ChatGoogleGenerativeAI(
    model='gemini-2.5-flash',
    temperature=0,
    max_retries=2,
    google_api_key=os.getenv("GEMINI_API_KEY"),
)


if len(sys.argv) < 2:
    print("Usage: python langchain_mcp_client.py <server_script_path>")
    sys.exit(1)

server_script_path = sys.argv[1]

server_params = StdioServerParameters(
    command="python",
    args=[server_script_path],
    env=None,
)

mcp_client = None

async def run_agent():
    global mcp_client

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            mcp_client = type("MCPClientHolder", (), {"session": session})()

            tools = await load_mcp_tools(session)

            agent = create_react_agent(llm, tools)
            print("MCP Client started! Type 'quit' to exit.")

            while True:
                query = input("\nQuery: ").strip()
                if query.lower() == "quit":
                    break

                response = await agent.ainvoke({"messages": query})

                try:
                    formmated = json.dumps(response, indent=2, cls=CustomEncoder)
                except Exception as e:
                    formmated = str(response)
                
                print("\nResponse:")
                print(formmated)
    return

if __name__ == '__main__':
    asyncio.run(run_agent())
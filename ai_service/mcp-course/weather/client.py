import asyncio
from fastmcp import Client


async def main():
    async with Client("http://127.0.0.1:8000/mcp") as client:
        if client.is_connected:
            print("Connected to server")

            tools = await client.list_tools()
            print("\n--- Available Tools ---")
            for tool in tools:
                print(f"{tool.name}: {tool.description}")

            print("\n---Getting weather for New York ---")
            response = await client.call_tool("get_weather", {"location": "New York"})
            print(response)
            print(response.data)

if __name__ == '__main__':
    asyncio.run(main())
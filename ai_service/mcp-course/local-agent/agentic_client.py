import asyncio
import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from mcp_use import MCPAgent, MCPClient

async def main():

    client = MCPClient.from_config_file(os.path.join(os.path.dirname(__file__), "mcp-http.json"))
    llm = ChatGoogleGenerativeAI(
        model='gemini-2.5-flash',
        google_api_key=os.getenv("GEMINI_API_KEY"),
    )

    agent = MCPAgent(llm=llm, client=client, max_steps=30, use_server_manager=True)

    result = await agent.run("What are the active weather alerts in Texas? Also, what's 12 multiply by 3761?")
    print(f"\nResult: {result}")

if __name__ == '__main__':
    asyncio.run(main())
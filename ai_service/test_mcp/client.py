import asyncio
import sys
import os
from typing import Optional, List, Dict, Any
from contextlib import AsyncExitStack

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from google import genai
from google.genai import types
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()  # load environment variables from .env

# Gemini model constant
GEMINI_MODEL = "gemini-2.5-flash" # Hoặc "gemini-1.5-pro"

class MCPClient:
    def __init__(self):
        # Initialize session and client objects
        self.session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()
        
        # Initialize Google GenAI Client
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        self.genai_client = genai.Client(api_key=api_key)

    async def connect_to_server(self, server_script_path: str):
        """Connect to an MCP server"""
        is_python = server_script_path.endswith('.py')
        is_js = server_script_path.endswith('.js')
        if not (is_python or is_js):
            raise ValueError("Server script must be a .py or .js file")

        if is_python:
            path = Path(server_script_path).resolve()
            server_params = StdioServerParameters(
                command="uv", # Hoặc "python" tùy môi trường của bạn
                args=["--directory", str(path.parent), "run", path.name],
                env=None,
            )
        else:
            server_params = StdioServerParameters(
                command="node", args=[server_script_path], env=None
            )

        stdio_transport = await self.exit_stack.enter_async_context(stdio_client(server_params))
        self.stdio, self.write = stdio_transport
        self.session = await self.exit_stack.enter_async_context(ClientSession(self.stdio, self.write))
        
        await self.session.initialize()
        
        # List available tools
        response = await self.session.list_tools()
        tools = response.tools
        print("\nConnected to server with tools:", [tool.name for tool in tools])

    async def process_query(self, query: str) -> str:
        """Process a query using Gemini and available tools"""
        
        # 1. Get tools from MCP Server
        response = await self.session.list_tools()
        
        # 2. Convert MCP tools to Gemini Function Declarations
        tool_declarations = []
        for tool in response.tools:
            tool_declarations.append(types.FunctionDeclaration(
                name=tool.name,
                description=tool.description,
                parameters=tool.inputSchema # MCP schema tương thích với Gemini
            ))

        # Create tool config
        tool_config = None
        if tool_declarations:
            tool_config = types.Tool(function_declarations=tool_declarations)

        # 3. Initialize Chat History (Contents)
        # Gemini expects a list of Content objects
        contents = [
            types.Content(
                role="user",
                parts=[types.Part(text=query)]
            )
        ]

        # 4. Process Loop (Model Call -> Tool Exec -> Model Call)
        final_text = []

        while True:
            # Call Gemini API asynchronously
            response = await self.genai_client.aio.models.generate_content(
                model=GEMINI_MODEL,
                contents=contents,
                config=types.GenerateContentConfig(
                    tools=[tool_config] if tool_config else None
                )
            )

            # Check if the response contains any text and print it
            if response.text:
                final_text.append(response.text)

            # Get function calls from the response
            # Gemini returns candidates -> content -> parts
            function_calls = []
            if response.candidates and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if part.function_call:
                        function_calls.append(part.function_call)

            # If no function calls, we are done
            if not function_calls:
                break

            # Add the model's response (which includes the tool call) to history
            # This is required for the conversation context
            contents.append(response.candidates[0].content)

            # Execute tools and collect responses
            function_responses = []
            
            for fc in function_calls:
                tool_name = fc.name
                tool_args = fc.args
                
                print(f"[Calling tool {tool_name} with args {tool_args}]")
                final_text.append(f"[Calling tool {tool_name} with args {tool_args}]")

                try:
                    # Execute tool call via MCP
                    result = await self.session.call_tool(tool_name, tool_args)
                    
                    # Format result for Gemini
                    # MCP returns a list of contents (text/image), Gemini expects a dict/json
                    tool_output = "".join(
                        [content.text for content in result.content if content.type == 'text']
                    )
                    
                    function_responses.append(types.Part(
                        function_response=types.FunctionResponse(
                            name=tool_name,
                            response={"result": tool_output}
                        )
                    ))
                except Exception as e:
                    # Handle tool execution errors gracefully
                    error_msg = f"Error execution tool: {str(e)}"
                    function_responses.append(types.Part(
                        function_response=types.FunctionResponse(
                            name=tool_name,
                            response={"error": error_msg}
                        )
                    ))

            # Send tool results back to Gemini
            if function_responses:
                # Add the tool outputs to the conversation history
                # Role "tool" is used for function responses in the new SDK logic usually, 
                # but typically mapped to 'user' context containing function_response parts in strictly typed list
                contents.append(types.Content(
                    role="user", # Gemini API often treats function response as a user turn in structure
                    parts=function_responses
                ))

        return "\n".join(final_text)

    async def chat_loop(self):
        """Run an interactive chat loop"""
        print("\nMCP Client Started (Gemini Powered)!")
        print("Type your queries or 'quit' to exit.")
        
        while True:
            try:
                query = input("\nQuery: ").strip()
                
                if query.lower() == 'quit':
                    break
                    
                response = await self.process_query(query)
                print("\n" + response)
                    
            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"\nError: {str(e)}")
    
    async def cleanup(self):
        """Clean up resources"""
        await self.exit_stack.aclose()

async def main():
    if len(sys.argv) < 2:
        print("Usage: python client.py <path_to_server_script>")
        sys.exit(1)
        
    client = MCPClient()
    try:
        await client.connect_to_server(sys.argv[1])
        await client.chat_loop()
    finally:
        await client.cleanup()

if __name__ == "__main__":
    asyncio.run(main())
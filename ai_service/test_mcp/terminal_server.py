import asyncio
import subprocess
from mcp.server.fastmcp import FastMCP

# Initialize FastMCP server
mcp = FastMCP("terminal-server")

@mcp.tool()
async def run_command(command: str, shell: str = "cmd", timeout: int = 30) -> str:
    """
    Execute a command in the Windows terminal.
    
    Args:
        command: The command to execute
        shell: The type of shell to use ('cmd' or 'powershell'), default is 'cmd'
        timeout: Timeout duration in seconds (default: 30)
    
    Returns:
        The command execution result including exit code, output, and error (if any)
    """
    try:
        if shell.lower() == "powershell":
            # Execute with PowerShell
            process = await asyncio.create_subprocess_exec(
                "powershell.exe",
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            encoding = 'utf-8'
        else:
            # Execute with CMD
            process = await asyncio.create_subprocess_shell(
                f'cmd.exe /c "{command}"',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                shell=True
            )
            encoding = 'cp1252'
        
        # Wait for result with timeout
        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=timeout
        )
        
        # Decode output
        stdout_text = stdout.decode(encoding, errors='replace') if stdout else ""
        stderr_text = stderr.decode(encoding, errors='replace') if stderr else ""
        
        # Format result
        result = f"Exit Code: {process.returncode}\n\n"
        if stdout_text:
            result += f"Output:\n{stdout_text}\n"
        if stderr_text:
            result += f"\nError:\n{stderr_text}"
        
        return result
        
    except asyncio.TimeoutError:
        return f"❌ Command timed out after {timeout} seconds"
    except Exception as e:
        return f"❌ Error executing command: {str(e)}"

if __name__ == "__main__":
    mcp.run()

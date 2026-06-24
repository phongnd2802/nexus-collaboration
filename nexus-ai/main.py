import asyncio
from servers.nexus.nexus_get_workspace import nexus_get_workspace


async def main():
    result = await nexus_get_workspace('01e046d0-5560-483d-9dc8-e421ef688e51')
    print(result)
    
if __name__ == "__main__":
    asyncio.run(main())

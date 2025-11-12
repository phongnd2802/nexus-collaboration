import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkAndCleanTaskLinks() {
  try {
    console.log("Checking for TaskLinks with RELATES_TO or DUPLICATES...");

    const linksToRemove = await prisma.taskLink.findMany({
      where: {
        relationship: {
          in: ["RELATES_TO" as any, "DUPLICATES" as any],
        },
      },
    });

    console.log(`Found ${linksToRemove.length} TaskLinks to remove`);

    if (linksToRemove.length > 0) {
      console.log("Links:", linksToRemove);

      // Xóa các links này
      const result = await prisma.taskLink.deleteMany({
        where: {
          relationship: {
            in: ["RELATES_TO" as any, "DUPLICATES" as any],
          },
        },
      });

      console.log(`Successfully deleted ${result.count} TaskLinks`);
    } else {
      console.log("No TaskLinks to remove. Safe to migrate!");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCleanTaskLinks();

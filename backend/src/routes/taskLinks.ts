import { Router } from "express";
import {
  deleteTaskLink,
  getTaskLinks,
  updateTaskLink,
  createTaskLink,
} from "../controllers/taskLinkController";

const router = Router({ mergeParams: true }); // mergeParams để access :taskId từ parent router

// Debug logging for task links router
router.use((req, res, next) => {
  console.log(`🔗 Task Links Router - ${req.method} ${req.originalUrl}`);
  console.log(`   Path: ${req.path}`);
  console.log(`   Params:`, req.params);
  console.log(`   Base URL: ${req.baseUrl}`);
  next();
});

// Create task link
router.post("/", createTaskLink);

// Get all task links for a task
router.get("/", getTaskLinks);

// Update task link
router.patch("/:linkId", updateTaskLink);

// Delete task link
router.delete("/:linkId", deleteTaskLink);

export default router;

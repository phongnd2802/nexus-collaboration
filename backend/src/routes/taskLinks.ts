import { Router } from "express";
import {
  deleteTaskLink,
  getTaskLinks,
  updateTaskLink,
  createTaskLink,
} from "../controllers/taskLinkController";

const router = Router({ mergeParams: true }); // mergeParams để access :taskId từ parent router

router.use((req, res, next) => {
  next();
});

router.post("/", createTaskLink);
router.get("/", getTaskLinks);
router.patch("/:linkId", updateTaskLink);
router.delete("/:linkId", deleteTaskLink);

export default router;

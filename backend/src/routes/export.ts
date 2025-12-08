import express from "express";
import {
  exportTaskPdf,
  exportProjectPdf,
} from "../controllers/exportController";

const router = express.Router();

router.get("/tasks/:taskId/pdf", exportTaskPdf);
router.get("/projects/:projectId/pdf", exportProjectPdf);

export default router;

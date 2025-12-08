import express from "express";
import { exportTaskPdf } from "../controllers/exportController";

const router = express.Router();

router.get("/tasks/:taskId/pdf", exportTaskPdf);

export default router;

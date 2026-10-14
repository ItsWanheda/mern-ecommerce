import express from "express";
import { adminRoute, protectRoute } from "../middleware/auth.middleware.js";
import { getAuditLogs, getOperationsDashboard } from "../controllers/admin.controller.js";

const router = express.Router();
router.get("/audit-logs", protectRoute, adminRoute, getAuditLogs);
router.get("/operations", protectRoute, adminRoute, getOperationsDashboard);
export default router;

import express from "express";
import { adminRoute, protectRoute } from "../middleware/auth.middleware.js";
import { getAuditLogs, getOperationsDashboard, getCustomers, getCustomerSessions, updateCustomerAccess, getInventoryAlerts, getAdminServiceCases, updateAdminServiceCase } from "../controllers/admin.controller.js";

const router = express.Router();
router.get("/audit-logs", protectRoute, adminRoute, getAuditLogs);
router.get("/customers", protectRoute, adminRoute, getCustomers);
router.get("/customers/:id/sessions", protectRoute, adminRoute, getCustomerSessions);
router.patch("/customers/:id/access", protectRoute, adminRoute, updateCustomerAccess);
router.get("/inventory", protectRoute, adminRoute, getInventoryAlerts);
router.get("/service-cases", protectRoute, adminRoute, getAdminServiceCases);
router.patch("/service-cases/:id", protectRoute, adminRoute, updateAdminServiceCase);
router.get("/operations", protectRoute, adminRoute, getOperationsDashboard);
export default router;

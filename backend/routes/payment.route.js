import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { checkoutSuccess, createCheckoutSession } from "../controllers/payment.controller.js";
import {
  getPaymentConfiguration,
  getZarinpalOrderStatus,
  reconcilePendingZarinpalOrders,
  verifyZarinpalPayment,
} from "../controllers/zarinpal.controller.js";
import { checkoutRateLimit } from "../middleware/rate-limit.middleware.js";

const router = express.Router();
router.get("/provider", getPaymentConfiguration);
router.get("/zarinpal/verify", verifyZarinpalPayment);
router.get("/zarinpal/order/:orderId", protectRoute, getZarinpalOrderStatus);
router.get("/reconcile-pending", reconcilePendingZarinpalOrders);
router.post("/create-checkout-session", checkoutRateLimit, protectRoute, createCheckoutSession);
router.post("/checkout-success", checkoutRateLimit, protectRoute, checkoutSuccess);
export default router;

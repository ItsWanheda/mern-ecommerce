import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { checkoutSuccess, createCheckoutSession } from "../controllers/payment.controller.js";
import { getPaymentConfiguration, verifyZarinpalPayment } from "../controllers/zarinpal.controller.js";

const router = express.Router();

router.get("/provider", getPaymentConfiguration);
router.get("/zarinpal/verify", verifyZarinpalPayment);
router.post("/create-checkout-session", protectRoute, createCheckoutSession);
router.post("/checkout-success", protectRoute, checkoutSuccess);

export default router;

import express from "express";
import { getNewsletterSubscribers, subscribeToNewsletter, unsubscribeFromNewsletter } from "../controllers/newsletter.controller.js";
import { adminRoute, protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/admin", protectRoute, adminRoute, getNewsletterSubscribers);
router.post("/subscribe", subscribeToNewsletter);
router.post("/unsubscribe", unsubscribeFromNewsletter);

export default router;

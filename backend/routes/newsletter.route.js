import express from "express";
import { subscribeToNewsletter, unsubscribeFromNewsletter } from "../controllers/newsletter.controller.js";

const router = express.Router();

router.post("/subscribe", subscribeToNewsletter);
router.post("/unsubscribe", unsubscribeFromNewsletter);

export default router;

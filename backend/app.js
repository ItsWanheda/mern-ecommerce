import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.route.js";
import productRoutes from "./routes/product.route.js";
import cartRoutes from "./routes/cart.route.js";
import couponRoutes from "./routes/coupon.route.js";
import paymentRoutes from "./routes/payment.route.js";
import analyticsRoutes from "./routes/analytics.route.js";
import campaignRoutes from "./routes/campaign.route.js";
import shippingRoutes from "./routes/shipping.route.js";
import newsletterRoutes from "./routes/newsletter.route.js";
import { apiRateLimit } from "./middleware/rate-limit.middleware.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.get("/api/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.get("/api/ready", (_req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ status: "not_ready", database: "disconnected" });
  }
  return res.status(200).json({ status: "ready", database: "connected" });
});

// Run the broad limit before parsing request bodies. Health probes remain lightweight.
app.use("/api", apiRateLimit);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/shipping", shippingRoutes);
app.use("/api/newsletter", newsletterRoutes);

app.use("/api", (_req, res) => res.status(404).json({ message: "API route not found" }));
app.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error?.status === 413 || error?.statusCode === 413) {
    return res.status(413).json({ message: "Request body is too large" });
  }
  if (error instanceof SyntaxError && (error.status === 400 || error.statusCode === 400) && "body" in error) {
    return res.status(400).json({ message: "Invalid JSON request body" });
  }
  console.error("Unhandled API error:", error?.message || error);
  return res.status(500).json({ message: "Internal server error" });
});

export default app;

import mongoose from "mongoose";
import AuditLog from "../models/audit-log.model.js";
import Order from "../models/order.model.js";
import { redis } from "../lib/redis.js";

const clampInteger = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

export const getAuditLogs = async (req, res) => {
  try {
    const page = clampInteger(req.query.page, 1, 1, 1000);
    const limit = clampInteger(req.query.limit, 30, 1, 50);
    const filter = {};
    if (typeof req.query.action === "string" && req.query.action.trim()) {
      const safeAction = req.query.action.trim().slice(0, 120).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.action = new RegExp(safeAction, "i");
    }
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).populate("actor", "name role").sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit).limit(limit).maxTimeMS(1500).lean(),
      AuditLog.countDocuments(filter).maxTimeMS(1500),
    ]);
    return res.json({ logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Unable to load audit history", error.message);
    return res.status(500).json({ message: "Unable to load audit history" });
  }
};

export const getOperationsDashboard = async (_req, res) => {
  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [
      pendingPayments,
      unfinalizedPaidOrders,
      waitingToShip,
      shippedWithoutTracking,
      failedPayments24h,
      auditEvents24h,
    ] = await Promise.all([
      Order.countDocuments({ paymentStatus: "pending" }).maxTimeMS(1500),
      Order.countDocuments({ paymentStatus: "paid", finalizedAt: null }).maxTimeMS(1500),
      Order.countDocuments({ paymentStatus: "paid", shipmentStatus: { $in: ["not_ready", "processing", "packed"] } }).maxTimeMS(1500),
      Order.countDocuments({ paymentStatus: "paid", shipmentStatus: { $in: ["shipped", "delivered"] }, trackingCode: { $in: ["", null] } }).maxTimeMS(1500),
      Order.countDocuments({ paymentStatus: "failed", updatedAt: { $gte: dayAgo } }).maxTimeMS(1500),
      AuditLog.countDocuments({ createdAt: { $gte: dayAgo } }).maxTimeMS(1500),
    ]);

    const readyState = mongoose.connection.readyState;
    let redisState = "unknown";
    try {
      if (typeof redis.ping !== "function") redisState = "unsupported";
      else {
        const response = await redis.ping();
        redisState = response === "PONG" ? "connected" : "unexpected_response";
      }
    } catch {
      redisState = "unavailable";
    }

    const databaseState = readyState === 1 ? "connected" : readyState === 2 ? "connecting" : readyState === 3 ? "disconnecting" : "disconnected";
    return res.json({
      generatedAt: now,
      health: { status: databaseState === "connected" && redisState === "connected" ? "healthy" : "degraded", database: databaseState, redis: redisState },
      payments: { pending: pendingPayments, paidAwaitingFinalization: unfinalizedPaidOrders, failedLast24Hours: failedPayments24h },
      fulfillment: { paidAwaitingShipment: waitingToShip, shippedWithoutTracking: shippedWithoutTracking },
      audit: { eventsLast24Hours: auditEvents24h },
    });
  } catch (error) {
    console.error("Unable to load operations dashboard", error.message);
    return res.status(500).json({ message: "Unable to load operations dashboard" });
  }
};

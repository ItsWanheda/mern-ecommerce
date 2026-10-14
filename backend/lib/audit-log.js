import AuditLog from "../models/audit-log.model.js";

export const recordAuditEvent = async (req, event) => {
  try {
    const metadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
      ? event.metadata
      : {};
    await AuditLog.create({
      actor: req.user?._id || null,
      actorName: typeof req.user?.name === "string" ? req.user.name.slice(0, 120) : "Admin",
      action: String(event.action || "unknown").slice(0, 120),
      targetType: String(event.targetType || "unknown").slice(0, 80),
      targetId: event.targetId == null ? "" : String(event.targetId).slice(0, 80),
      summary: String(event.summary || event.action || "Admin action").slice(0, 500),
      metadata,
      ip: typeof req.ip === "string" ? req.ip.slice(0, 64) : "",
      userAgent: typeof req.get === "function" ? String(req.get("user-agent") || "").slice(0, 256) : "",
    });
  } catch (error) {
    console.error("Failed to record admin audit event:", error.message);
  }
};

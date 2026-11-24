import { Prisma } from "@prisma/client";
import AuditLog from "../models/audit-log.model.js";
import { getClientIpAddress } from "./client-ip.js";

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

// Normalize metadata before diffing/persistence. PostgreSQL Json accepts plain
// JSON values, not Prisma Decimal internals, methods, or prototype properties.
export const toAuditJsonValue = (value, ancestors = new WeakSet()) => {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (Prisma.Decimal.isDecimal(value)) return value.toString();
  if (typeof value?.toHexString === "function") return value.toHexString();
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) return value.toString("base64");
  if (typeof value !== "object") return String(value);
  if (ancestors.has(value)) return "[Circular]";

  ancestors.add(value);
  let normalized;
  if (Array.isArray(value)) {
    normalized = value.map((entry) => {
      const safeEntry = toAuditJsonValue(entry, ancestors);
      return safeEntry === undefined ? null : safeEntry;
    });
  } else {
    normalized = {};
    for (const [key, nested] of Object.entries(value)) {
      if (key === "constructor" || key === "__proto__" || key === "prototype") continue;
      const safeValue = toAuditJsonValue(nested, ancestors);
      if (safeValue !== undefined) normalized[key] = safeValue;
    }
  }
  ancestors.delete(value);
  return normalized;
};

const comparableValue = (value) => {
  if (value instanceof Date) return value.toISOString();
  if (Prisma.Decimal.isDecimal(value)) return value.toString();
  if (value && typeof value.toHexString === "function") return value.toHexString();
  if (Array.isArray(value)) return value.map(comparableValue);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, comparableValue(value[key])])
    );
  }
  return value;
};

const sameValue = (left, right) =>
  JSON.stringify(comparableValue(left)) === JSON.stringify(comparableValue(right));

const buildChangeSet = (metadata) => {
  const before = isRecord(metadata.before) ? metadata.before : {};
  const after = isRecord(metadata.after) ? metadata.after : {};
  const hasSnapshots = isRecord(metadata.before) || isRecord(metadata.after);
  const supplied = isRecord(metadata.changes) ? metadata.changes : null;
  if (!hasSnapshots && !supplied) return null;

  const candidates = supplied || Object.fromEntries(
    [...new Set([...Object.keys(before), ...Object.keys(after)])].map((key) => [
      key,
      { before: before[key] ?? null, after: after[key] ?? null },
    ])
  );
  return Object.fromEntries(Object.entries(candidates).filter(([, delta]) =>
    !sameValue(delta?.before ?? null, delta?.after ?? null)
  ));
};

const safeOrigin = (value) => {
  try {
    const parsed = new URL(String(value || ""));
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.origin.slice(0, 200) : "";
  } catch {
    return "";
  }
};

const safeRefererPath = (value) => {
  try {
    const parsed = new URL(String(value || ""));
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    // Keep path context but deliberately discard query strings/fragments that may contain tokens.
    return (parsed.origin + parsed.pathname).slice(0, 300);
  } catch {
    return "";
  }
};

const headerValue = (req, name, maxLength) => {
  if (typeof req.get !== "function") return "";
  return String(req.get(name) || "").replace(/[\r\n]/g, "").slice(0, maxLength);
};

export const recordAuditEvent = async (req, event) => {
  try {
    const metadataInput = isRecord(event.metadata) ? event.metadata : {};
    const metadata = toAuditJsonValue(metadataInput) || {};
    const changes = buildChangeSet(metadata);
    if (changes) {
      metadata.changes = changes;
      metadata.changedFields = Object.keys(changes);
      metadata.changeCount = Object.keys(changes).length;
    }

    const referer = headerValue(req, "referer", 1000);
    const origin = headerValue(req, "origin", 300);
    const requestId = headerValue(req, "x-request-id", 160)
      || headerValue(req, "x-vercel-id", 160)
      || String(req.id || "").slice(0, 160);

    await AuditLog.create({
      actor: req.user?._id || null,
      actorName: typeof req.user?.name === "string" ? req.user.name.slice(0, 120) : "Admin",
      actorRole: typeof req.user?.role === "string" ? req.user.role.slice(0, 40) : "",
      action: String(event.action || "unknown").slice(0, 120),
      targetType: String(event.targetType || "unknown").slice(0, 80),
      targetId: event.targetId == null ? "" : String(event.targetId).slice(0, 80),
      summary: String(event.summary || event.action || "Admin action").slice(0, 500),
      metadata,
      ip: getClientIpAddress(req).slice(0, 64),
      userAgent: headerValue(req, "user-agent", 256),
      requestMethod: typeof req.method === "string" ? req.method.slice(0, 12) : "",
      requestPath: typeof req.path === "string" ? String(req.baseUrl || "") + req.path : "",
      requestId,
      requestHost: headerValue(req, "host", 200),
      requestOrigin: safeOrigin(origin),
      refererPath: safeRefererPath(referer),
    });
  } catch (error) {
    console.error("Failed to record admin audit event:", error.message);
  }
};

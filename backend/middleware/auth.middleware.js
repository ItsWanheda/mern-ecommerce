import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
	try {
		const accessToken = req.cookies.accessToken;

		if (!accessToken) {
			return res.status(401).json({ message: "Unauthorized - No access token provided" });
		}

		try {
			const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
			const user = await User.findById(decoded.userId).select("-password");

			if (!user || user.isActive === false) {
				return res.status(401).json({ message: "Authentication required" });
			}

			req.user = user;

			next();
		} catch (error) {
			if (error.name === "TokenExpiredError") {
				return res.status(401).json({ message: "Unauthorized - Access token expired" });
			}
			throw error;
		}
	} catch (error) {
		console.log("Error in protectRoute middleware", error.message);
		return res.status(401).json({ message: "Unauthorized - Invalid access token" });
	}
};

const permissionForRequest = (req) => {
  const base = req.baseUrl || "";
  const path = req.path || "/";
  if (base === "/api/analytics") return "reports.view";
  if (base === "/api/orders") return "orders.manage";
  if (base === "/api/products" || base === "/api/categories") return "catalogue.manage";
  if (["/api/campaigns", "/api/coupons", "/api/newsletter"].includes(base)) return "marketing.manage";
  if (base === "/api/shipping" || base === "/api/store-settings") return "settings.manage";
  if (base === "/api/admin") {
    if (path.startsWith("/customers")) return req.method === "PATCH" && path.endsWith("/access") ? "roles.manage" : "customers.manage";
    if (path.startsWith("/permissions")) return "roles.manage";
    if (path.startsWith("/service-cases")) return "support.manage";
    if (path.startsWith("/inventory")) return "inventory.manage";
    if (path.startsWith("/audit-logs")) return "audit.view";
    if (path.startsWith("/operations")) return "system.view";
  }
  return null;
};

export const adminRoute = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });
  const granted = req.user.permissions;
  // Legacy administrators retain existing access until permissions are explicitly configured.
  if (!Array.isArray(granted)) return next();
  const required = permissionForRequest(req);
  if (!required || granted.includes("*") || granted.includes(required)) return next();
  return res.status(403).json({ message: "You do not have permission to perform this action" });
};

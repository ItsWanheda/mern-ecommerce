import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  updateAccountProfile, changePassword, requestEmailVerification, verifyEmail, requestEmailChange, confirmEmailChange,
  getAccountSessions, revokeAccountSession, getSecurityNotifications, markSecurityNotificationRead,
  getCommunicationPreferences, updateCommunicationPreferences, getAccountWishlist, addWishlistProduct,
  removeWishlistProduct, clearAccountWishlist, getAccountOverview, exportAccountData,
  requestAccountDeletion, setupTwoFactor, enableTwoFactor, disableTwoFactor,
} from "../controllers/account-management.controller.js";

const router = express.Router();
router.post("/verify-email", verifyEmail);
router.post("/confirm-email-change", confirmEmailChange);
router.use(protectRoute);
router.get("/overview", getAccountOverview);
router.patch("/profile", updateAccountProfile);
router.patch("/password", changePassword);
router.post("/email/verification", requestEmailVerification);
router.post("/email/change", requestEmailChange);
router.get("/sessions", getAccountSessions);
router.delete("/sessions/:sessionId", revokeAccountSession);
router.get("/notifications", getSecurityNotifications);
router.patch("/notifications/:id/read", markSecurityNotificationRead);
router.get("/preferences", getCommunicationPreferences);
router.patch("/preferences", updateCommunicationPreferences);
router.get("/wishlist", getAccountWishlist);
router.post("/wishlist", addWishlistProduct);
router.delete("/wishlist", clearAccountWishlist);
router.delete("/wishlist/:productId", removeWishlistProduct);
router.get("/export", exportAccountData);
router.post("/deletion-request", requestAccountDeletion);
router.post("/two-factor/setup", setupTwoFactor);
router.post("/two-factor/enable", enableTwoFactor);
router.post("/two-factor/disable", disableTwoFactor);
export default router;

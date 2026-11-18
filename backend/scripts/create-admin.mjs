import "dotenv/config";
import bcrypt from "bcryptjs";
import { getPasswordPolicyError } from "../lib/password-policy.js";
import { prisma } from "../lib/prisma.js";

const required = ["ADMIN_NAME", "ADMIN_EMAIL", "ADMIN_PASSWORD"];
const missing = required.filter((key) => !process.env[key]?.trim());

if (process.env.ALLOW_ADMIN_BOOTSTRAP !== "true") {
  console.error("Admin bootstrap is disabled. Set ALLOW_ADMIN_BOOTSTRAP=true for this one-time command.");
  process.exitCode = 1;
} else if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exitCode = 1;
} else {
  try {
    const name = process.env.ADMIN_NAME.trim();
    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    const passwordError = getPasswordPolicyError(password);

    if (passwordError) {
      throw new Error(passwordError);
    }

    await prisma.$transaction(async (tx) => {
      const existingAdminCount = await tx.user.count({ where: { role: "admin" } });
      if (existingAdminCount > 0) {
        throw new Error("An Admin account already exists. Bootstrap will not create or modify another account.");
      }

      const existingEmail = await tx.user.findUnique({ where: { email } });
      if (existingEmail) {
        throw new Error("The requested Admin email is already registered. Bootstrap will not change that account's role.");
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "admin",
          permissions: ["*"],
          isActive: true,
          twoFactorEnabled: false,
        },
      });
    }, { isolationLevel: "Serializable" });

    console.info(`Initial Admin account created for ${email}. The password was not logged.`);
  } catch (error) {
    console.error("Admin bootstrap failed:", error?.message || "Unknown error");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

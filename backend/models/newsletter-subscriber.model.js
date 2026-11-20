import { createPrismaModel } from "../lib/prisma-model.js";

// Prisma/PostgreSQL-backed model repository. The exported operations preserve
// the existing controller contract while all persistence is handled by Prisma.
const newsletterSubscriber = createPrismaModel("newsletterSubscriber");
export default newsletterSubscriber;

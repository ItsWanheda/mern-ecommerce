import { createPrismaModel } from "../lib/prisma-model.js";

// Prisma/PostgreSQL-backed model repository. The exported operations preserve
// the existing controller contract while all persistence is handled by Prisma.
const user = createPrismaModel("user");
export default user;

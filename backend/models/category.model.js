import { createPrismaModel } from "../lib/prisma-model.js";

// Prisma/PostgreSQL-backed model repository. The exported operations preserve
// the existing controller contract while all persistence is handled by Prisma.
const category = createPrismaModel("category");
export default category;

const prisma = new PrismaClient();

export const ready = Boolean(prisma);

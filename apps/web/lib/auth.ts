import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

/**
 * Get or create the DB User from the current Clerk session.
 */
export async function getOrCreateUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  return prisma.user.create({
    data: {
      clerkId: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      name: clerkUser.firstName
        ? `${clerkUser.firstName} ${clerkUser.lastName ?? ""}`.trim()
        : undefined,
      role: "CREATOR",
    },
  });
}

/**
 * Check if user has entitlement to a program.
 */
export async function hasEntitlement(userId: string, programId: string) {
  const ent = await prisma.entitlement.findUnique({
    where: { userId_programId: { userId, programId } },
  });
  return ent?.status === "ACTIVE";
}

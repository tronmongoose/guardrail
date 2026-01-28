import { prisma } from "./prisma";

const hasClerk = !!(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.CLERK_SECRET_KEY
);

/**
 * Get or create the DB User from the current Clerk session.
 * Falls back to a dev mock user when Clerk is not configured.
 */
export async function getOrCreateUser() {
  if (!hasClerk) {
    // Dev mode: return or create a mock user
    // #COMPLETION_DRIVE: Mock user for local dev without Clerk
    // #SUGGEST_VERIFY: Set Clerk keys for real auth flow
    const devEmail = "dev@guiderail.local";
    const existing = await prisma.user.findUnique({ where: { email: devEmail } });
    if (existing) return existing;
    return prisma.user.create({
      data: {
        clerkId: "dev_local",
        email: devEmail,
        name: "Dev User",
        role: "CREATOR",
      },
    });
  }

  const { auth, currentUser } = await import("@clerk/nextjs/server");
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

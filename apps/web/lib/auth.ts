import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const LEARNER_SESSION_COOKIE = "guiderail_learner_session";

/**
 * Get or create the DB User from the current Clerk session.
 * This is for creators who use Clerk authentication.
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
 * Get the learner user from the magic link session cookie.
 * This is for learners who use magic link authentication.
 */
export async function getLearnerSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(LEARNER_SESSION_COOKIE);

  if (!sessionCookie?.value) return null;

  const user = await prisma.user.findUnique({
    where: { id: sessionCookie.value },
  });

  return user;
}

/**
 * Get the current user - checks both Clerk (creator) and magic link (learner) sessions.
 * Prioritizes Clerk auth for creators, falls back to magic link session for learners.
 */
export async function getCurrentUser() {
  // First try Clerk auth (for creators)
  const clerkUser = await getOrCreateUser();
  if (clerkUser) return clerkUser;

  // Fall back to magic link session (for learners)
  return getLearnerSession();
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

/**
 * Get entitlement with full details for a user/program pair.
 */
export async function getEntitlement(userId: string, programId: string) {
  return prisma.entitlement.findUnique({
    where: { userId_programId: { userId, programId } },
    include: {
      weekCompletions: true,
    },
  });
}

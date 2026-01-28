import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/p/(.*)",
  "/api/webhooks/(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

// #COMPLETION_DRIVE: If Clerk keys missing, skip auth middleware so landing page still renders
// #SUGGEST_VERIFY: Set real Clerk keys for any auth-gated flow
const hasClerkKeys = !!(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.CLERK_SECRET_KEY
);

const clerkHandler = hasClerkKeys
  ? clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) {
        await auth.protect();
      }
    })
  : (_req: NextRequest) => NextResponse.next();

export default clerkHandler;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

import Link from "next/link";
import * as ClerkComponents from "@clerk/nextjs";

const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function AuthNav() {
  if (!hasClerk) {
    return (
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-sm text-neon-cyan font-medium hover:neon-text-cyan transition-all"
        >
          Dashboard
        </Link>
      </div>
    );
  }

  const { SignInButton, SignedIn, SignedOut, UserButton } = ClerkComponents;

  return (
    <div className="flex items-center gap-4">
      <SignedOut>
        <SignInButton mode="modal">
          <button className="text-sm text-gray-400 hover:text-neon-cyan transition-all">
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <Link href="/dashboard" className="text-sm text-neon-cyan font-medium">
          Dashboard
        </Link>
        <UserButton />
      </SignedIn>
    </div>
  );
}

export function AuthCTA() {
  if (!hasClerk) {
    return (
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/dashboard" className="btn-neon px-8 py-4 rounded-xl text-surface-dark text-center">
          Start building
        </Link>
        <Link
          href="#how-it-works"
          className="px-8 py-4 rounded-xl border border-surface-border text-gray-300 hover:border-neon-cyan hover:text-neon-cyan transition-all text-center font-medium"
        >
          See how it works
        </Link>
      </div>
    );
  }

  const { SignInButton, SignedIn, SignedOut } = ClerkComponents;

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <SignedOut>
        <SignInButton mode="modal">
          <button className="btn-neon px-8 py-4 rounded-xl text-surface-dark">
            Start building
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <Link href="/dashboard" className="btn-neon px-8 py-4 rounded-xl text-surface-dark text-center">
          Go to dashboard
        </Link>
      </SignedIn>
      <Link
        href="#how-it-works"
        className="px-8 py-4 rounded-xl border border-surface-border text-gray-300 hover:border-neon-cyan hover:text-neon-cyan transition-all text-center font-medium"
      >
        See how it works
      </Link>
    </div>
  );
}

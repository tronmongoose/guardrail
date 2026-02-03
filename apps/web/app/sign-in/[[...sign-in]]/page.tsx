import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen gradient-bg-radial grid-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-surface-card border border-surface-border shadow-2xl",
              headerTitle: "text-white",
              headerSubtitle: "text-gray-400",
              socialButtonsBlockButton:
                "bg-surface-dark border border-surface-border text-white hover:bg-surface-card",
              socialButtonsBlockButtonText: "text-white",
              dividerLine: "bg-surface-border",
              dividerText: "text-gray-500",
              formFieldLabel: "text-gray-300",
              formFieldInput:
                "bg-surface-dark border-surface-border text-white placeholder:text-gray-500 focus:border-neon-cyan focus:ring-neon-cyan",
              formButtonPrimary:
                "bg-gradient-to-r from-neon-cyan to-neon-pink hover:opacity-90 text-surface-dark font-semibold",
              footerActionLink: "text-neon-cyan hover:text-neon-pink",
              identityPreviewText: "text-white",
              identityPreviewEditButton: "text-neon-cyan",
            },
          }}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}

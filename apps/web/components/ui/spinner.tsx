interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: "cyan" | "pink" | "white";
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

const colorClasses = {
  cyan: "border-neon-cyan",
  pink: "border-neon-pink",
  white: "border-white",
};

export function Spinner({ size = "md", color = "cyan", className = "" }: SpinnerProps) {
  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${colorClasses[color]}
        border-2 border-t-transparent rounded-full animate-spin
        ${className}
      `}
      role="status"
      aria-label="Loading"
    />
  );
}

export function SpinnerOverlay({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-surface-dark/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        {message && <p className="text-sm text-gray-400">{message}</p>}
      </div>
    </div>
  );
}

export function InlineSpinner({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Spinner size="sm" />
      {message && <span className="text-sm text-gray-400">{message}</span>}
    </div>
  );
}

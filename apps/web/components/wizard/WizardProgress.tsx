"use client";

interface WizardProgressProps {
  steps: { label: string; description?: string }[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function WizardProgress({
  steps,
  currentStep,
  onStepClick,
}: WizardProgressProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isClickable = onStepClick && index <= currentStep;

        return (
          <div key={index} className="flex items-center flex-1">
            {/* Step circle */}
            <button
              type="button"
              onClick={() => isClickable && onStepClick?.(index)}
              disabled={!isClickable}
              className={`
                relative flex items-center justify-center w-10 h-10 rounded-full
                transition-all duration-300
                ${
                  isCompleted
                    ? "bg-neon-cyan text-surface-dark"
                    : isCurrent
                      ? "bg-neon-cyan/20 border-2 border-neon-cyan text-neon-cyan"
                      : "bg-surface-card border border-surface-border text-gray-500"
                }
                ${isClickable ? "cursor-pointer hover:scale-110" : "cursor-default"}
              `}
            >
              {isCompleted ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <span className="text-sm font-semibold">{index + 1}</span>
              )}
            </button>

            {/* Step label */}
            <div className="ml-3 hidden sm:block">
              <p
                className={`text-sm font-medium ${
                  isCurrent ? "text-neon-cyan" : isCompleted ? "text-white" : "text-gray-500"
                }`}
              >
                {step.label}
              </p>
              {step.description && (
                <p className="text-xs text-gray-500">{step.description}</p>
              )}
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-4">
                <div
                  className={`h-0.5 rounded transition-all duration-300 ${
                    isCompleted ? "bg-neon-cyan" : "bg-surface-border"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

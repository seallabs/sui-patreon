'use client';

import { useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react';

interface ChannelProgressIndicatorProps {
  isCreating: boolean;
  isComplete: boolean;
}

type ProgressStep = {
  label: string;
  duration: number; // milliseconds
};

const PROGRESS_STEPS: ProgressStep[] = [
  { label: 'Initializing channel...', duration: 1000 },
  { label: 'Creating on-chain channel...', duration: 3000 },
  { label: 'Setting up encryption keys...', duration: 2000 },
  { label: 'Finalizing...', duration: 1000 },
];

export function ChannelProgressIndicator({ isCreating, isComplete }: ChannelProgressIndicatorProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isCreating) {
      setCurrentStep(0);
      setProgress(0);
      return;
    }

    let stepIndex = 0;
    let progressValue = 0;
    const stepProgress = 100 / PROGRESS_STEPS.length;

    const interval = setInterval(() => {
      if (stepIndex < PROGRESS_STEPS.length) {
        setCurrentStep(stepIndex);
        progressValue = (stepIndex + 1) * stepProgress;
        setProgress(Math.min(progressValue, 95)); // Cap at 95% until actually complete
        stepIndex++;
      }
    }, PROGRESS_STEPS[stepIndex]?.duration || 1000);

    return () => clearInterval(interval);
  }, [isCreating]);

  useEffect(() => {
    if (isComplete) {
      setProgress(100);
      setCurrentStep(PROGRESS_STEPS.length);
    }
  }, [isComplete]);

  if (!isCreating && !isComplete) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
      {/* Progress bar */}
      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Current step */}
      <div className="flex items-center gap-2 text-sm">
        {isComplete ? (
          <>
            <Check className="h-4 w-4 flex-shrink-0 text-green-600" />
            <span className="font-medium text-green-600">Channel created successfully!</span>
          </>
        ) : (
          <>
            <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-primary" />
            <span className="text-muted-foreground">
              {PROGRESS_STEPS[currentStep]?.label || 'Creating channel...'}
            </span>
          </>
        )}
      </div>

      {/* Progress percentage */}
      <div className="text-right">
        <span className="text-xs font-medium text-muted-foreground">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

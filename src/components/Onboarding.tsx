import { useState, useCallback } from 'react';

type OnboardingStep = {
  icon: 'crank' | 'hike' | 'weather' | 'connect';
  title: string;
  description: string;
};

const STEPS: OnboardingStep[] = [
  {
    icon: 'crank',
    title: 'Power on the go',
    description: 'Generate electricity by cranking. Track your output in real-time and keep your devices charged on any adventure.',
  },
  {
    icon: 'hike',
    title: 'Track your trail',
    description: 'Record hikes with GPS, elevation, and energy stats. See exactly how much power you generated along the way.',
  },
  {
    icon: 'weather',
    title: 'Weather at a glance',
    description: 'Built-in sensors show temperature, pressure, humidity, and altitude wherever you are.',
  },
  {
    icon: 'connect',
    title: 'Connect your pack',
    description: 'Pair over Bluetooth for live telemetry, or explore with the demo pack right now.',
  },
];

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const advance = useCallback(() => {
    if (isLast) {
      setExiting(true);
      setTimeout(onComplete, 280);
    } else {
      setStep((s) => s + 1);
    }
  }, [isLast, onComplete]);

  const skip = useCallback(() => {
    setExiting(true);
    setTimeout(onComplete, 280);
  }, [onComplete]);

  return (
    <div className={`onboarding ${exiting ? 'onboarding-exit' : ''}`}>
      <div className="onboarding-bg" />
      
      <button type="button" className="onboarding-skip" onClick={skip}>
        Skip
      </button>

      <div className="onboarding-content" key={step}>
        <div className="onboarding-icon">
          <OnboardingIcon name={current.icon} />
        </div>
        <h1 className="onboarding-title">{current.title}</h1>
        <p className="onboarding-desc">{current.description}</p>
      </div>

      <div className="onboarding-footer">
        <div className="onboarding-dots" role="group" aria-label="Progress">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`onboarding-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
              onClick={() => setStep(i)}
              aria-label={`Step ${i + 1}`}
              aria-current={i === step ? 'step' : undefined}
            />
          ))}
        </div>
        <button type="button" className="btn onboarding-btn" onClick={advance}>
          {isLast ? 'Get Started' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

function OnboardingIcon({ name }: { name: OnboardingStep['icon'] }) {
  if (name === 'crank') {
    return (
      <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="40" cy="40" r="28" className="onboarding-icon-ring" />
        <path d="M40 24v32M28 40h24" />
        <path d="M32 28l16 24M48 28l-16 24" opacity="0.4" />
        <circle cx="40" cy="40" r="6" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (name === 'hike') {
    return (
      <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 60c12-24 16-24 28-24s16 0 28 24" className="onboarding-icon-ring" />
        <path d="M24 30l8 8 12-16 12 12" />
        <circle cx="56" cy="22" r="5" fill="currentColor" stroke="none" opacity="0.3" />
      </svg>
    );
  }
  if (name === 'weather') {
    return (
      <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M34 52V20a6 6 0 1 1 12 0v32" />
        <circle cx="40" cy="56" r="10" className="onboarding-icon-ring" />
        <path d="M56 32h8M60 40h6M56 48h8" opacity="0.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 36c0-8.8 7.2-16 16-16s16 7.2 16 16" className="onboarding-icon-ring" />
      <circle cx="40" cy="50" r="10" />
      <path d="M40 40v20M32 58l4-4M48 58l-4-4" />
      <circle cx="24" cy="36" r="3" fill="currentColor" stroke="none" />
      <circle cx="56" cy="36" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

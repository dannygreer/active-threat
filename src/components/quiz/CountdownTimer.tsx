'use client';

import { useEffect, useRef, useState } from 'react';

interface CountdownTimerProps {
  seconds: number;
  onTimeout: () => void;
}

export default function CountdownTimer({ seconds, onTimeout }: CountdownTimerProps) {
  const startRef = useRef(performance.now());
  const firedRef = useRef(false);
  const chainRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    startRef.current = performance.now();
    firedRef.current = false;
    setRemaining(seconds);

    const tick = () => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      const next = seconds - elapsed;

      if (next <= 0) {
        setRemaining(0);
        if (!firedRef.current) {
          firedRef.current = true;
          onTimeoutRef.current();
        }
        return;
      }

      setRemaining(next);
      // Random interval 200-900ms creates irregular psychological pressure
      const delay = 200 + Math.random() * 700;
      chainRef.current = setTimeout(tick, delay);
    };

    chainRef.current = setTimeout(tick, 200 + Math.random() * 700);
    return () => {
      if (chainRef.current) clearTimeout(chainRef.current);
    };
  }, [seconds]);

  const whole = Math.max(0, Math.floor(remaining));
  const tenths = Math.max(0, Math.floor((remaining % 1) * 10));

  const isCritical = remaining < 3;
  const isLow = remaining < 5;

  return (
    <div
      className={`text-6xl font-mono font-bold tabular-nums drop-shadow-lg mb-6 transition-colors ${
        isCritical
          ? 'text-red-400'
          : isLow
            ? 'text-orange-300'
            : 'text-white'
      }`}
    >
      {whole}.{tenths}
    </div>
  );
}

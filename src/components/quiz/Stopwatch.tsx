'use client';

import { useEffect, useRef, useState } from 'react';

export default function Stopwatch() {
  const startRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    startRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsed(Date.now() - startRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const seconds = Math.floor(elapsed / 1000);
  const tenths = Math.floor((elapsed % 1000) / 100);

  return (
    <div className="text-6xl font-mono font-bold tabular-nums text-white drop-shadow-lg mb-6">
      {seconds}.{tenths}s
    </div>
  );
}

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
    <div className="fixed top-4 right-4 bg-zinc-900 text-white px-4 py-2 rounded-lg font-mono text-lg tabular-nums shadow-lg">
      {seconds}.{tenths}s
    </div>
  );
}

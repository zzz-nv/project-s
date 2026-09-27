'use client';

import { useEffect, useState, useRef } from 'react';
import SLogoLoader from '@/components/SLogoLoader';


const FADE_MS = 220;
const MIN_VISIBLE_MS = 300; // forced minimum on-screen time
const MAX_VISIBLE_MS = 5000; // safety: never let it get stuck

export default function SplashOverlay() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAtRef = useRef<number>(0);

  useEffect(() => {
    const clear = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const doHide = () => {
      clear();
      setFading(true);
      setTimeout(() => {
        setVisible(false);
        setFading(false);
      }, FADE_MS);
    };

    const hide = () => {
      const elapsed = Date.now() - shownAtRef.current;
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

      if (remaining > 0) {
        clear();
        timeoutRef.current = setTimeout(doHide, remaining);
      } else {
        doHide();
      }
    };

    const show = () => {
      clear();
      shownAtRef.current = Date.now();
      setFading(false);
      setVisible(true);
      // Auto-hide in case nobody fires the hide event
      timeoutRef.current = setTimeout(doHide, MAX_VISIBLE_MS);
    };

    window.addEventListener('show-splash', show);
    window.addEventListener('hide-splash', hide);
    return () => {
      window.removeEventListener('show-splash', show);
      window.removeEventListener('hide-splash', hide);
      clear();
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] bg-background flex items-center justify-center transition-opacity duration-200 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
        <SLogoLoader />
    </div>
  );
}
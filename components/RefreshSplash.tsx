'use client';

import { useEffect } from 'react';

const VISIBLE_MS = 700;
const FADE_MS = 200;

export default function RefreshSplash() {
  useEffect(() => {
    const el = document.getElementById('refresh-splash');
    if (!el) return;

    // Not a reload — ensure it never shows
    if (!el.classList.contains('active')) {
      el.style.display = 'none';
      return;
    }

    const fadeTimer = setTimeout(() => {
      el.classList.add('fading');
      // After fade completes, hide entirely — but DO NOT remove from DOM
      setTimeout(() => {
        el.style.display = 'none';
      }, FADE_MS);
    }, VISIBLE_MS);

    return () => clearTimeout(fadeTimer);
  }, []);

  return null;
}
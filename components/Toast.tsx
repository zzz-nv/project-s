'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ToastItem {
  id: number;
  message: string;
}

let counter = 0;

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message: string };
      const id = ++counter;
      setToasts((prev) => [...prev, { id, message: detail.message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 1800);
    };
    window.addEventListener('show-toast', handler);
    return () => window.removeEventListener('show-toast', handler);
  }, []);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, scale: 0.6, y: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -10 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 28,
              mass: 0.7,
            }}
            className="px-7 py-4 rounded-2xl bg-brand text-white text-sm font-bold shadow-2xl shadow-brand/50 flex items-center gap-3 border border-white/10"
          >
            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
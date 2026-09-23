'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TweetImagesProps {
  urls: string[];
}

export default function TweetImages({ urls }: TweetImagesProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!urls || urls.length === 0) return null;

  const images = urls.slice(0, 4);
  const count = images.length;

  const open = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setOpenIndex(index);
  };

  return (
    <>
      {/* ─── 1 IMAGE ─── */}
      {count === 1 && (
        <div className="mt-3 rounded-2xl overflow-hidden border border-border-subtle">
          <img
            src={images[0]}
            alt=""
            onClick={(e) => open(e, 0)}
            className="w-full max-h-[600px] object-cover cursor-pointer hover:brightness-95 transition"
          />
        </div>
      )}

      {/* ─── 2 IMAGES ─── */}
      {count === 2 && (
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl overflow-hidden bg-border-subtle">
          {images.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              onClick={(e) => open(e, i)}
              className="w-full h-[320px] object-cover cursor-pointer hover:brightness-95 transition"
            />
          ))}
        </div>
      )}

      {/* ─── 3 IMAGES ─── */}
      {count === 3 && (
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl overflow-hidden bg-border-subtle h-[400px]">
          <img
            src={images[0]}
            alt=""
            onClick={(e) => open(e, 0)}
            className="w-full h-full object-cover cursor-pointer hover:brightness-95 transition"
          />
          <div className="grid grid-rows-2 gap-1">
            <img
              src={images[1]}
              alt=""
              onClick={(e) => open(e, 1)}
              className="w-full h-full object-cover cursor-pointer hover:brightness-95 transition"
            />
            <img
              src={images[2]}
              alt=""
              onClick={(e) => open(e, 2)}
              className="w-full h-full object-cover cursor-pointer hover:brightness-95 transition"
            />
          </div>
        </div>
      )}

      {/* ─── 4 IMAGES ─── */}
      {count === 4 && (
        <div className="mt-3 grid grid-cols-2 grid-rows-2 gap-1 rounded-2xl overflow-hidden bg-border-subtle h-[440px]">
          {images.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              onClick={(e) => open(e, i)}
              className="w-full h-full object-cover cursor-pointer hover:brightness-95 transition"
            />
          ))}
        </div>
      )}

      {/* ─── LIGHTBOX ─── */}
      {openIndex !== null && typeof document !== 'undefined' &&
        createPortal(
          <Lightbox
            images={images}
            initialIndex={openIndex}
            onClose={() => setOpenIndex(null)}
          />,
          document.body
        )
      }
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// LIGHTBOX
// ═══════════════════════════════════════════════════════════
function Lightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const count = images.length;

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && count > 1) next();
      else if (e.key === 'ArrowLeft' && count > 1) prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, next, prev, count]);

  // Lock body scroll while open
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, []);

  return (
       <div
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 left-4 w-10 h-10 rounded-full bg-zinc-900/80 hover:bg-zinc-800 flex items-center justify-center text-white z-10 transition"
        aria-label="Close"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Counter */}
      {count > 1 && (
        <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-zinc-900/80 text-white text-sm font-bold z-10">
          {index + 1} / {count}
        </div>
      )}

      {/* Prev arrow */}
      {count > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="absolute left-4 w-12 h-12 rounded-full bg-zinc-900/80 hover:bg-zinc-800 flex items-center justify-center text-white z-10 transition"
          aria-label="Previous"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Next arrow */}
      {count > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="absolute right-4 w-12 h-12 rounded-full bg-zinc-900/80 hover:bg-zinc-800 flex items-center justify-center text-white z-10 transition"
          aria-label="Next"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* The image */}
      <img
        src={images[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full object-contain select-none"
        draggable={false}
      />
    </div>
  );
}
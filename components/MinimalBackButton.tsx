'use client';

import { useRouter } from 'next/navigation';

export default function MinimalBackButton() {
  const router = useRouter();

  return (
    <button 
      onClick={() => router.back()} 
      className="p-2 -ml-2 rounded-full hover:bg-surface-muted/80 transition text-white focus:outline-none"
      aria-label="Go back"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
      </svg>
    </button>
  );
}
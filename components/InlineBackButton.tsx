'use client';
import { useRouter } from 'next/navigation';

export default function InlineBackButton({ title }: { title?: string }) {
  const router = useRouter();
  
  return (
    <div className="sticky top-0 z-40 bg-background backdrop-blur-md border-b border-border-subtle p-4 flex items-center gap-6">
      <button 
        onClick={() => router.back()} 
        className="hover:bg-surface-muted p-2 rounded-full transition-colors group"
      >
        <svg className="w-5 h-5 text-text-muted group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
      </button>
      {title && <h2 className="font-bold text-xl">{title}</h2>}
    </div>
  );
}
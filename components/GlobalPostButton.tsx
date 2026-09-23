'use client';

export default function GlobalPostButton() {
  return (
    <button 
      onClick={() => window.dispatchEvent(new CustomEvent('open-compose'))}
      className="bg-brand bg-hover bg-text font-bold py-2 px-6 rounded-full shadow-lg shadow-amber-500/10 hover:scale-105 transition-all active:scale-95"
    >
      Post
    </button>
  );
}
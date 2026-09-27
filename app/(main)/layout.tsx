'use client';

import LeftRailProfile from "@/components/LeftRailProfile";
import ComposeModal from "@/components/ComposeModal";
import WhoToFollow from "@/components/WhoToFollow";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { supabase } from "@/app/supabase";

const scrollPositions = new Map<string, number>();

function getScrollKey(pathname: string): string {
  if (pathname === '/' && typeof window !== 'undefined') {
    const tab = sessionStorage.getItem('feed-tab') || 'global';
    return `/@feed-${tab}`;
  }
  return pathname;
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const mainRef = useRef<HTMLElement>(null);

  
  const [authChecked, setAuthChecked] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const isChat = pathname?.startsWith('/chat');
  const containerWidth = isChat ? "w-[650px]" : "w-[650px]";

  // Hydration flag for the layoutId slide animation
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Auth gate — no protected page renders until we know the session state
  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      window.dispatchEvent(new CustomEvent('show-splash'));

      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session) {
        router.replace('/login');
        return;
      }

      

      // Fetch username for the Profile nav item
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single();

      if (!cancelled && data) setUsername(data.username);

      setAuthChecked(true);
      window.dispatchEvent(new CustomEvent('hide-splash'));
    }

    checkAuth();
    return () => { cancelled = true; };
  }, [router]);

  // Save scroll position as the user scrolls
  useEffect(() => {
    const el = mainRef.current;
    if (!el || !pathname) return;

    const handleScroll = () => {
      scrollPositions.set(getScrollKey(pathname), el.scrollTop);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  // Kill the browser's native scroll restore — we handle it ourselves
  useLayoutEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  // On refresh, force scroll to top. On SPA nav, restore position.
  useLayoutEffect(() => {
    const el = mainRef.current;
    if (!el || !pathname) return;

    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type === 'reload') {
      el.scrollTop = 0;
      return;
    }

    const RESTORE_EXACT = ['/', '/search', '/chat'];
    if (!RESTORE_EXACT.includes(pathname)) return;

    const snapId = pathname === '/' ? sessionStorage.getItem('snap-to-tweet') : null;
    if (snapId) sessionStorage.removeItem('snap-to-tweet');

    const saved = scrollPositions.get(getScrollKey(pathname));
    if (!snapId && !saved) return;

    let cancelled = false;
    const startTime = Date.now();
    let stableFrames = 0;

    const tryRestore = () => {
      if (cancelled) return;
      if (!mainRef.current) return;
      if (Date.now() - startTime > 2000) return;

      let target = saved ?? 0;

      if (snapId) {
        const tweetEl = document.querySelector(`[data-tweet-id="${snapId}"]`) as HTMLElement | null;
        if (!tweetEl) {
          requestAnimationFrame(tryRestore);
          return;
        }
        const containerRect = mainRef.current.getBoundingClientRect();
        const tweetRect = tweetEl.getBoundingClientRect();
        target = mainRef.current.scrollTop + (tweetRect.top - containerRect.top) - 64;
      }

      const current = mainRef.current.scrollTop;
      if (Math.abs(current - target) > 2) {
        mainRef.current.scrollTop = target;
        stableFrames = 0;
        requestAnimationFrame(tryRestore);
      } else {
        stableFrames++;
        if (stableFrames < 6) {
          requestAnimationFrame(tryRestore);
        }
      }
    };

    tryRestore();
    return () => { cancelled = true; };
  }, [pathname]);

  // Reset scroll when the feed tab changes
  useEffect(() => {
    const handler = () => {
      if (mainRef.current && pathname === '/') {
        mainRef.current.scrollTop = 0;
      }
    };
    window.addEventListener('reset-feed-scroll', handler);
    return () => window.removeEventListener('reset-feed-scroll', handler);
  }, [pathname]);

  const navItems = [
    { href: '/', label: 'Home', path: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
   
    { href: '/search', label: 'Search', path: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
    { href: '/notifications', label: 'Notifications', path: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { href: '/chat', label: 'Chat', path: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { href: '/settings', label: 'Settings', path: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
     ...(username ? [{ href: `/${username}`, label: 'Profile', path: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }] : []),
  ];

  // While checking auth, render nothing — the splash covers the screen
  if (!authChecked) return null;

  return (
        <div className="h-screen overflow-hidden bg-background flex justify-center">

        <div className="flex h-full">

        {/* LEFT RAIL */}
        <nav className="w-[260px] shrink-0 h-full flex flex-col py-4 px-2">

          <Link href="/" className="w-17 h-14 flex items-center justify-center mb-2 hover:opacity-90 transition-opacity">
            <img src="/S_logo.svg" alt="S" className="w-16 h-13" />
          </Link>

          <div className="flex flex-col">
            {navItems.map(({ href, label, path }) => {
              const isActive = href === '/' ? pathname === '/' : pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="group relative flex items-center gap-5 px-3 py-3 rounded-full transition-colors hover:bg-surface"
                >
                  {isActive && (
                    <motion.span
                      key={isHydrated ? 'hydrated' : 'initial'}
                      layoutId={isHydrated ? 'rail-accent' : undefined}
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full bg-brand h-6"
                      transition={{ type: 'tween', duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                    />
                  )}

                  <svg
                    className={`w-7 h-7 shrink-0 transition-colors ${
                      isActive ? 'text-brand' : 'text-zinc-300'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d={path}
                    />
                  </svg>

                  <span
                    className={`text-xl font-normal transition-colors ${
                      isActive ? 'text-brand' : 'text-zinc-300'
                    }`}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* POST BUTTON — sits right after Settings */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-compose'))}
            className="w-[calc(100%-24px)] mx-auto block bg-brand hover:bg-brand-hover text-white font-bold text-base py-2.5 rounded-full transition-colors active:scale-[0.98] mt-4"
          >
            Post
          </button>

          {/* PROFILE — pinned to bottom */}
          <div className="mt-auto">
            <LeftRailProfile />
          </div>

        </nav>

        <main ref={mainRef} className={`${containerWidth} shrink-0 h-full overflow-y-auto no-scrollbar border-x border-border-subtle`}>
          {children}
        </main>

        {/* RIGHT COLUMN — always mounted, visually hidden in chat */}
        <aside className="w-[340px] shrink-0 h-full hidden xl:block pt-4 pl-8 pr-4 overflow-y-auto no-scrollbar">
          <div className={isChat ? 'hidden' : 'block'}>
            <WhoToFollow />
          </div>
        </aside>

      </div>

      <ComposeModal />
    </div>
  );
}
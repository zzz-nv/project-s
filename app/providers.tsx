'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  // useState ensures the client is created once per browser session, not per render
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,        // 30 seconds — data is "fresh" for this long
        gcTime: 5 * 60 * 1000,       // 5 minutes — cache entries are freed after this
        refetchOnWindowFocus: false, // Don't refetch every time the tab regains focus
        retry: 1,                    // Retry failed queries once, then give up
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
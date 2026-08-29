'use client';

import * as React from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

export const isConvexConfigured = Boolean(
  process.env.NEXT_PUBLIC_CONVEX_URL &&
  process.env.NEXT_PUBLIC_CONVEX_URL !== 'https://placeholder-deployment.convex.cloud' &&
  process.env.NEXT_PUBLIC_CONVEX_URL.startsWith('http')
);

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  const convexClient = React.useMemo(() => {
    if (!isConvexConfigured || !process.env.NEXT_PUBLIC_CONVEX_URL) {
      return null;
    }
    try {
      return new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);
    } catch {
      return null;
    }
  }, []);

  if (!convexClient) {
    return <>{children}</>;
  }

  return <ConvexProvider client={convexClient}>{children}</ConvexProvider>;
}

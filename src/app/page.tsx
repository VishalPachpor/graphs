'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useIsMobile } from '@/hooks/useIsMobile';
import { AppControls } from '@/components/AppControls';
import { GraphLegend } from '@/components/GraphLegend';

// Dynamic imports to avoid SSR issues
const GraphCanvas = dynamic(
  () => import('@/components/GraphCanvas').then((mod) => mod.GraphCanvas),
  { ssr: false }
);
const NodeDetails = dynamic(
  () => import('@/components/NodeDetails').then((mod) => mod.NodeDetails),
  { ssr: false }
);
const MobileApp = dynamic(
  () => import('@/components/mobile').then((mod) => mod.MemoryOrbitApp),
  { ssr: false }
);

export default function Home() {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading state during hydration
  if (!mounted) {
    return (
      <main className="h-screen w-screen bg-[#0a0a0f] flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  // Mobile view
  if (isMobile) {
    return <MobileApp />;
  }

  // Desktop view
  return (
    <main className="h-screen w-screen bg-[#0a0a0f] overflow-hidden relative">
      <AppControls />
      <GraphLegend />
      <GraphCanvas />
      <NodeDetails />
    </main>
  );
}


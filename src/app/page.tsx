import { GraphCanvas } from '@/components/GraphCanvas';
import { NodeDetails } from '@/components/NodeDetails';
import { AppControls } from '@/components/AppControls';
import { GraphLegend } from '@/components/GraphLegend';

export default function Home() {
  return (
    <main className="h-screen w-screen bg-[#0a0a0f] overflow-hidden relative">
      <AppControls />
      <GraphLegend />
      <GraphCanvas />
      <NodeDetails />
    </main>
  );
}

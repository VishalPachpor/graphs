import { GraphCanvas } from '@/components/GraphCanvas';
import { NodeDetails } from '@/components/NodeDetails';

export default function Home() {
  return (
    <main className="h-screen w-screen bg-[#0a0a0f] overflow-hidden relative">
      <GraphCanvas />
      <NodeDetails />
    </main>
  );
}

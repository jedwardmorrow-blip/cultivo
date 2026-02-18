import { Warehouse } from 'lucide-react';

export function HarvestSessionsList() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-cult-white uppercase tracking-wide">Harvest Sessions</h1>
        <p className="text-cult-light-gray mt-2">Record harvests and create batches</p>
      </div>

      <div className="bg-cult-near-black border border-cult-medium-gray p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Warehouse className="w-16 h-16 text-cult-medium-gray mb-6" />
        <h2 className="text-2xl font-semibold text-cult-white uppercase tracking-wide mb-3">
          Coming Soon
        </h2>
        <p className="text-cult-light-gray text-center max-w-md">
          Harvest sessions will record wet weights and automatically create
          batch registry entries, linking cultivation directly to the post-harvest pipeline.
        </p>
      </div>
    </div>
  );
}

import { Warehouse } from 'lucide-react';

export function GrowRoomsManagement() {
  return (
    <div className="space-y-6">
      <div className="bg-cult-near-black border border-cult-medium-gray p-12 flex flex-col items-center justify-center min-h-[300px]">
        <Warehouse className="w-12 h-12 text-cult-medium-gray mb-4" />
        <h2 className="text-xl font-semibold text-cult-white uppercase tracking-wide mb-3">
          Grow Rooms — Coming Soon
        </h2>
        <p className="text-cult-light-gray text-center max-w-md text-sm">
          Configure grow rooms with room codes, types (clone, veg, flower, mixed),
          and capacity limits. Rooms are referenced by plant groups and harvest sessions.
        </p>
      </div>
    </div>
  );
}

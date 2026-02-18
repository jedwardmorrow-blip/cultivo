import { Leaf } from 'lucide-react';

export function PlantGroupsList() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-cult-white uppercase tracking-wide">Plant Groups</h1>
        <p className="text-cult-light-gray mt-2">Track plant groups through growth stages</p>
      </div>

      <div className="bg-cult-near-black border border-cult-medium-gray p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Leaf className="w-16 h-16 text-cult-medium-gray mb-6" />
        <h2 className="text-2xl font-semibold text-cult-white uppercase tracking-wide mb-3">
          Coming Soon
        </h2>
        <p className="text-cult-light-gray text-center max-w-md">
          Plant group management will allow tracking strain, count, room assignment,
          and growth stage transitions from clone through flower.
        </p>
      </div>
    </div>
  );
}

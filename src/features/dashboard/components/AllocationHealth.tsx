import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllocationHealth } from '../services/dashboard.service';

export function AllocationHealth() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOrders: 0,
    fullyAllocated: 0,
    partiallyAllocated: 0,
    notAllocated: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllocationHealth();
  }, []);

  async function loadAllocationHealth() {
    try {
      const { data } = await getAllocationHealth();

      const stats = data?.reduce((acc, summary) => {
        acc.totalOrders++;
        if (summary.items_awaiting_allocation === 0) {
          acc.fullyAllocated++;
        } else if (summary.items_allocated > 0) {
          acc.partiallyAllocated++;
        } else {
          acc.notAllocated++;
        }
        return acc;
      }, { totalOrders: 0, fullyAllocated: 0, partiallyAllocated: 0, notAllocated: 0 });

      setStats(stats || { totalOrders: 0, fullyAllocated: 0, partiallyAllocated: 0, notAllocated: 0 });
    } catch (error) {
      console.error('Error loading allocation health:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-cult-light-gray">Loading allocation health...</div>;
  }

  const allocationRate = stats.totalOrders > 0
    ? Math.round((stats.fullyAllocated / stats.totalOrders) * 100)
    : 0;

  return (
    <div>
      <h2 className="text-lg font-semibold text-cult-white uppercase tracking-wide mb-4">Allocation Health</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-cult-black p-4 border border-green-600">
          <p className="text-green-400 text-sm uppercase tracking-wider">Fully Allocated</p>
          <p className="text-3xl font-bold text-cult-white mt-2">{stats.fullyAllocated}</p>
        </div>
        <div className="bg-cult-black p-4 border border-yellow-600">
          <p className="text-yellow-400 text-sm uppercase tracking-wider">Partial</p>
          <p className="text-3xl font-bold text-cult-white mt-2">{stats.partiallyAllocated}</p>
        </div>
        <div className="bg-cult-black p-4 border border-red-600">
          <p className="text-red-400 text-sm uppercase tracking-wider">Not Allocated</p>
          <p className="text-3xl font-bold text-cult-white mt-2">{stats.notAllocated}</p>
        </div>
        <div className="bg-cult-black p-4 border border-cult-medium-gray">
          <p className="text-cult-light-gray text-sm uppercase tracking-wider">Allocation Rate</p>
          <p className="text-3xl font-bold text-cult-white mt-2">{allocationRate}%</p>
        </div>
      </div>
      <button
        onClick={() => navigate('/inventory-all')}
        className="mt-4 px-4 py-2 border border-cult-medium-gray text-cult-white hover:border-cult-white transition-all text-sm uppercase tracking-wider"
      >
        View Inventory
      </button>
    </div>
  );
}

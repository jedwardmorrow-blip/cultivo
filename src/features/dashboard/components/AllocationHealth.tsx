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
    return <div className="text-cult-text-muted text-xs uppercase tracking-widest animate-pulse">Loading allocation health...</div>;
  }

  const allocationRate = stats.totalOrders > 0
    ? Math.round((stats.fullyAllocated / stats.totalOrders) * 100)
    : 0;

  return (
    <div>
      <h2 className="text-xs font-semibold text-cult-text-primary uppercase tracking-[1.5px] mb-4">Allocation Health</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-cult-surface-raised p-4 border border-cult-success/30 rounded-cult">
          <p className="text-cult-success text-[0.625rem] uppercase tracking-wider font-semibold">Fully Allocated</p>
          <p className="text-2xl font-bold text-cult-text-primary mt-2">{stats.fullyAllocated}</p>
        </div>
        <div className="bg-cult-surface-raised p-4 border border-cult-warning/30 rounded-cult">
          <p className="text-cult-warning text-[0.625rem] uppercase tracking-wider font-semibold">Partial</p>
          <p className="text-2xl font-bold text-cult-text-primary mt-2">{stats.partiallyAllocated}</p>
        </div>
        <div className="bg-cult-surface-raised p-4 border border-cult-danger/30 rounded-cult">
          <p className="text-cult-danger text-[0.625rem] uppercase tracking-wider font-semibold">Not Allocated</p>
          <p className="text-2xl font-bold text-cult-text-primary mt-2">{stats.notAllocated}</p>
        </div>
        <div className="bg-cult-surface-raised p-4 border border-cult-border rounded-cult">
          <p className="text-cult-text-muted text-[0.625rem] uppercase tracking-wider font-semibold">Allocation Rate</p>
          <p className="text-2xl font-bold text-cult-text-primary mt-2">{allocationRate}%</p>
        </div>
      </div>
      <button
        onClick={() => navigate('/inventory-all')}
        className="mt-4 px-4 py-2 border border-cult-border text-cult-text-secondary hover:text-cult-text-primary hover:border-cult-border-strong transition-all text-[0.625rem] uppercase tracking-wider rounded-cult"
      >
        View Inventory
      </button>
    </div>
  );
}

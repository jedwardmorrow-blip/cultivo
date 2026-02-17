import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getOrderWorkflowStatus } from '../services/dashboard.service';

interface WorkflowStats {
  submitted: number;
  accepted: number;
  processing: number;
  ready_for_delivery: number;
}

export function OrderWorkflowStatus({}: { onSelectOrder: (orderId: string) => void }) {
  const [stats, setStats] = useState<WorkflowStats>({
    submitted: 0,
    accepted: 0,
    processing: 0,
    ready_for_delivery: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();

    const channel = supabase
      .channel('workflow-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadStats() {
    try {
      const { data } = await getOrderWorkflowStatus();

      const counts = data?.reduce((acc, order) => {
        const status = order.status || 'submitted';
        acc[status as keyof WorkflowStats] = (acc[status as keyof WorkflowStats] || 0) + 1;
        return acc;
      }, { submitted: 0, accepted: 0, processing: 0, ready_for_delivery: 0 } as WorkflowStats);

      setStats(counts || { submitted: 0, accepted: 0, processing: 0, ready_for_delivery: 0 });
    } catch (error) {
      console.error('Error loading workflow stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-cult-light-gray">Loading workflow status...</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-cult-white uppercase tracking-wide mb-4">Order Workflow Status</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-cult-black p-4 border border-blue-600">
          <p className="text-blue-400 text-sm uppercase tracking-wider">Submitted</p>
          <p className="text-3xl font-bold text-cult-white mt-2">{stats.submitted}</p>
        </div>
        <div className="bg-cult-black p-4 border border-cyan-600">
          <p className="text-cyan-400 text-sm uppercase tracking-wider">Accepted</p>
          <p className="text-3xl font-bold text-cult-white mt-2">{stats.accepted}</p>
        </div>
        <div className="bg-cult-black p-4 border border-yellow-600">
          <p className="text-yellow-400 text-sm uppercase tracking-wider">Processing</p>
          <p className="text-3xl font-bold text-cult-white mt-2">{stats.processing}</p>
        </div>
        <div className="bg-cult-black p-4 border border-green-600">
          <p className="text-green-400 text-sm uppercase tracking-wider">Ready</p>
          <p className="text-3xl font-bold text-cult-white mt-2">{stats.ready_for_delivery}</p>
        </div>
      </div>
    </div>
  );
}

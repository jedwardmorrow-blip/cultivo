import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { updateTicket } from '@/features/admin/services/ticket.service';

interface TriageTicket {
  id: string;
  type: string;
  title: string;
  status: string;
  severity: string | null;
  priority: string | null;
  request_type: string | null;
  bug_category: string | null;
  affected_area: string | null;
  ai_analysis: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  reported_by_name: string | null;
  reported_by_email: string | null;
  priority_rank: number;
}

type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved';

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved'] as const;

const severityColors: Record<string, string> = {
  critical: 'bg-cult-danger-muted text-cult-danger border-cult-danger/30',
  high: 'bg-cult-warning-muted text-cult-warning border-cult-warning/30',
  medium: 'bg-cult-warning-muted text-cult-warning border-cult-warning/30',
  low: 'bg-cult-info-muted text-cult-info border-cult-info/30',
};

const statusColors: Record<string, string> = {
  open: 'bg-cult-danger-muted text-cult-danger',
  in_progress: 'bg-cult-warning-muted text-cult-warning',
  resolved: 'bg-cult-success-muted text-cult-success',
};

export function TicketTriage() {
  const { isAdmin } = useAuth();
  const [tickets, setTickets] = useState<TriageTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('v_ticket_triage').select('*').order('priority_rank', { ascending: true }).order('created_at', { ascending: false });
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    const { data, error } = await query;
    if (!error && data) setTickets(data as TriageTicket[]);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const updateStatus = async (ticketId: string, newStatus: string) => {
    setSaving(ticketId);
    const updates: Record<string, any> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'resolved') updates.resolved_at = new Date().toISOString();
    const notes = editingNotes[ticketId];
    if (notes !== undefined) updates.resolution_notes = notes;
    await updateTicket(ticketId, updates);
    setSaving(null);
    fetchTickets();
  };

  const saveNotes = async (ticketId: string) => {
    setSaving(ticketId);
    await updateTicket(ticketId, {
      resolution_notes: editingNotes[ticketId] || '',
      updated_at: new Date().toISOString(),
    });
    setSaving(null);
    fetchTickets();
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-cult-border">Admin access required.</p>
      </div>
    );
  }

  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-cult-text-primary">Ticket Triage</h1>
          <p className="text-sm text-cult-border mt-1">
            {openCount} open{inProgressCount > 0 ? ` · ${inProgressCount} in progress` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {(['all', 'open', 'in_progress', 'resolved'] as StatusFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === f
                  ? 'bg-cult-accent text-cult-opaque-black'
                  : 'bg-cult-surface text-cult-text-secondary hover:bg-cult-surface'
              }`}
            >
              {f === 'all' ? 'All' : f.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cult-accent" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 text-cult-border">No tickets found.</div>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => {
            const isExpanded = expandedId === ticket.id;
            const sevClass = severityColors[ticket.severity || 'medium'] || severityColors.medium;
            const statClass = statusColors[ticket.status] || statusColors.open;

            return (
              <div
                key={ticket.id}
                className="bg-cult-surface border border-cult-surface rounded-lg overflow-hidden"
              >
                <div
                  className="px-4 py-3 cursor-pointer hover:bg-cult-surface/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-xs text-cult-border">{ticket.id.slice(0, 8)}</code>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${sevClass}`}>
                          {(ticket.severity || 'medium').toUpperCase()}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${statClass}`}>
                          {ticket.status.replace(/_/g, ' ')}
                        </span>
                        <span className="px-2 py-0.5 text-xs text-cult-border bg-cult-dark rounded">
                          {ticket.type}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-cult-text-primary truncate">{ticket.title}</h3>
                      <p className="text-xs text-cult-text-secondary mt-1">
                        {ticket.reported_by_name || 'Unknown'} · {ticket.affected_area || 'general'} · {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <svg className={`w-5 h-5 text-cult-border transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-cult-surface">
                    {ticket.ai_analysis && (
                      <div className="mt-3 p-3 bg-cult-dark rounded-md">
                        <p className="text-xs font-medium text-cult-border mb-1">AI Analysis</p>
                        <p className="text-sm text-cult-text-secondary">{ticket.ai_analysis}</p>
                      </div>
                    )}
                    {ticket.description && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-cult-border mb-1">Original Report</p>
                        <p className="text-sm text-cult-text-secondary whitespace-pre-wrap">{ticket.description}</p>
                      </div>
                    )}

                    <div className="mt-4 flex items-start gap-4">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-cult-border block mb-1">Notes</label>
                        <textarea
                          className="w-full bg-cult-dark border border-cult-surface rounded-md px-3 py-2 text-sm text-cult-text-primary placeholder-cult-border focus:border-cult-accent focus:outline-none resize-none"
                          rows={2}
                          placeholder="Resolution notes..."
                          value={editingNotes[ticket.id] ?? ticket.resolution_notes ?? ''}
                          onChange={e => setEditingNotes(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                        />
                        {editingNotes[ticket.id] !== undefined && editingNotes[ticket.id] !== (ticket.resolution_notes ?? '') && (
                          <button
                            onClick={() => saveNotes(ticket.id)}
                            disabled={saving === ticket.id}
                            className="mt-1 px-3 py-1 text-xs bg-cult-surface text-cult-text-secondary rounded hover:bg-cult-border/20 transition-colors disabled:opacity-50"
                          >
                            {saving === ticket.id ? 'Saving...' : 'Save Notes'}
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-medium text-cult-border block mb-1">Status</label>
                        <div className="flex gap-1">
                          {STATUS_OPTIONS.map(s => (
                            <button
                              key={s}
                              onClick={() => updateStatus(ticket.id, s)}
                              disabled={saving === ticket.id || ticket.status === s}
                              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-30 ${
                                ticket.status === s
                                  ? 'bg-cult-accent text-cult-opaque-black'
                                  : 'bg-cult-surface text-cult-text-secondary hover:bg-cult-border/30'
                              }`}
                            >
                              {s.replace(/_/g, ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TicketTriage;

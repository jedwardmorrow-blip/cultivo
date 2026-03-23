import { useState, useEffect, useCallback } from 'react';
import { Pin, PinOff, StickyNote, Phone, Mail, MapPin, Package, CalendarClock, MessageSquare } from 'lucide-react';
import type { CustomerActivity, ActivityType } from '../types';
import { getPinnedNotes, togglePinActivity } from '../services';
import { formatDate } from '@/shared/utils/format';

interface AccountPinnedNotesProps {
  customerId: string;
  onUnpin?: () => void;
}

const activityIcons: Record<string, typeof MessageSquare> = {
  call: Phone,
  email: Mail,
  visit: MapPin,
  sample: Package,
  note: StickyNote,
  follow_up: CalendarClock,
};

const activityColors: Record<string, string> = {
  call: 'text-sky-400 bg-sky-500/15',
  email: 'text-cyan-400 bg-cyan-500/15',
  visit: 'text-emerald-400 bg-emerald-500/15',
  sample: 'text-amber-400 bg-amber-500/15',
  note: 'text-cult-silver bg-cult-dark-gray',
  follow_up: 'text-rose-400 bg-rose-500/15',
};

export function AccountPinnedNotes({ customerId, onUnpin }: AccountPinnedNotesProps) {
  const [pinnedNotes, setPinnedNotes] = useState<CustomerActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPinned = useCallback(async () => {
    setLoading(true);
    const result = await getPinnedNotes(customerId);
    if (result.data) setPinnedNotes(result.data);
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    fetchPinned();
  }, [fetchPinned]);

  const handleUnpin = async (activityId: string) => {
    await togglePinActivity(activityId, false);
    setPinnedNotes((prev) => prev.filter((n) => n.id !== activityId));
    onUnpin?.();
  };

  if (loading) return null;
  if (pinnedNotes.length === 0) return null;

  return (
    <div className="bg-cult-near-black border border-amber-500/20 rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-cult-charcoal flex items-center gap-2">
        <Pin className="w-3.5 h-3.5 text-amber-400" />
        <h3 className="text-xs font-semibold text-cult-white uppercase tracking-wider">Pinned Notes</h3>
        <span className="text-xs text-amber-400 font-semibold ml-auto">{pinnedNotes.length}</span>
      </div>
      <div className="divide-y divide-cult-charcoal/50">
        {pinnedNotes.map((note) => {
          const IconComp = activityIcons[note.activity_type] || StickyNote;
          const colorClass = activityColors[note.activity_type] || activityColors.note;
          return (
            <div key={note.id} className="px-5 py-3 flex items-start gap-3 group">
              <div className={`p-1.5 rounded ${colorClass} flex-shrink-0 mt-0.5`}>
                <IconComp className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-cult-white">{note.subject}</p>
                {note.body && (
                  <p className="text-xs text-cult-light-gray mt-1 line-clamp-2">{note.body}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-cult-silver">
                  <span>{formatDate(note.created_at)}</span>
                  {note.user_name && <span>by {note.user_name}</span>}
                </div>
              </div>
              <button
                onClick={() => handleUnpin(note.id)}
                className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-cult-dark-gray text-cult-medium-gray hover:text-amber-400 transition-all flex-shrink-0"
                title="Unpin note"
              >
                <PinOff className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

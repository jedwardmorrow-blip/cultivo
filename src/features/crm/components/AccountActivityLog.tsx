import { useState } from 'react';
import { MessageSquare, Phone, Mail, MapPin, Package, CalendarClock, Plus, Save, StickyNote, Pin, PinOff } from 'lucide-react';
import type { CustomerActivity, ActivityType, CustomerActivityInput } from '../types';
import { createActivity, togglePinActivity } from '../services';

interface AccountActivityLogProps {
  activities: CustomerActivity[];
  customerId: string;
  onReload: () => void;
}

const activityIcons: Record<ActivityType, typeof MessageSquare> = {
  call: Phone,
  email: Mail,
  visit: MapPin,
  sample: Package,
  note: StickyNote,
  follow_up: CalendarClock,
};

const activityColors: Record<ActivityType, string> = {
  call: 'text-sky-400 bg-sky-500/15',
  email: 'text-cyan-400 bg-cyan-500/15',
  visit: 'text-cult-success bg-cult-success-muted',
  sample: 'text-cult-warning bg-cult-warning-muted',
  note: 'text-cult-text-secondary bg-cult-surface',
  follow_up: 'text-rose-400 bg-rose-500/15',
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function AccountActivityLog({ activities, customerId, onReload }: AccountActivityLogProps) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<{
    activity_type: ActivityType;
    subject: string;
    body: string;
    follow_up_date: string;
  }>({
    activity_type: 'note',
    subject: '',
    body: '',
    follow_up_date: '',
  });

  const handleSave = async () => {
    if (!formData.subject.trim()) return;
    setSaving(true);
    const input: CustomerActivityInput = {
      customer_id: customerId,
      activity_type: formData.activity_type,
      subject: formData.subject.trim(),
      body: formData.body.trim() || undefined,
      follow_up_date: formData.follow_up_date || undefined,
    };
    await createActivity(input);
    setFormData({ activity_type: 'note', subject: '', body: '', follow_up_date: '' });
    setShowForm(false);
    setSaving(false);
    onReload();
  };

  return (
    <div className="bg-cult-surface border border-cult-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-cult-surface-raised flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cult-text-secondary" />
          <h3 className="text-sm font-semibold text-cult-text-primary uppercase tracking-wider">Activity Log</h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-cult-text-primary bg-cult-surface border border-cult-border rounded hover:bg-cult-surface-raised transition-colors"
        >
          <Plus className="w-3 h-3" />
          Log Activity
        </button>
      </div>

      {showForm && (
        <div className="px-5 py-4 border-b border-cult-surface-raised bg-cult-surface/30 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={formData.activity_type}
              onChange={(e) => setFormData({ ...formData, activity_type: e.target.value as ActivityType })}
              className="px-3 py-2 bg-cult-surface border border-cult-border rounded text-sm text-cult-text-primary focus:outline-none focus:border-cult-text-muted"
            >
              <option value="note">Note</option>
              <option value="call">Phone Call</option>
              <option value="email">Email</option>
              <option value="visit">Visit</option>
              <option value="sample">Sample Sent</option>
              <option value="follow_up">Follow Up</option>
            </select>
            <input
              type="date"
              placeholder="Follow-up date"
              value={formData.follow_up_date}
              onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
              className="px-3 py-2 bg-cult-surface border border-cult-border rounded text-sm text-cult-text-primary focus:outline-none focus:border-cult-text-muted"
            />
          </div>
          <input
            type="text"
            placeholder="Subject *"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="w-full px-3 py-2 bg-cult-surface border border-cult-border rounded text-sm text-cult-text-primary placeholder-cult-text-secondary focus:outline-none focus:border-cult-text-muted"
          />
          <textarea
            placeholder="Details (optional)"
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 bg-cult-surface border border-cult-border rounded text-sm text-cult-text-primary placeholder-cult-text-secondary focus:outline-none focus:border-cult-text-muted resize-none"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!formData.subject.trim() || saving}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-cult-opaque-black bg-cult-accent rounded hover:bg-cult-accent-hover transition-colors disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
            <button
              onClick={() => { setShowForm(false); setFormData({ activity_type: 'note', subject: '', body: '', follow_up_date: '' }); }}
              className="px-3 py-1.5 text-xs text-cult-text-secondary hover:text-cult-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-cult-surface-raised/50">
        {activities.map((activity) => {
          const IconComp = activityIcons[activity.activity_type as ActivityType] || StickyNote;
          const colorClass = activityColors[activity.activity_type as ActivityType] || activityColors.note;
          const isPinned = activity.pinned;
          return (
            <div key={activity.id} className="px-5 py-3 flex items-start gap-3 group">
              <div className={`p-1.5 rounded ${colorClass} flex-shrink-0 mt-0.5`}>
                <IconComp className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-cult-text-primary">{activity.subject}</span>
                  <span className="text-xs text-cult-text-secondary capitalize">{activity.activity_type.replace('_', ' ')}</span>
                  {isPinned && <Pin className="w-3 h-3 text-cult-warning" />}
                </div>
                {activity.body && (
                  <p className="text-xs text-cult-text-muted mt-1 line-clamp-2">{activity.body}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-cult-text-secondary">
                  <span>{formatRelativeDate(activity.created_at)}</span>
                  {activity.user_name && <span>by {activity.user_name}</span>}
                  {activity.follow_up_date && (
                    <span className="text-cult-warning">Follow up: {activity.follow_up_date}</span>
                  )}
                </div>
              </div>
              <button
                onClick={async () => {
                  await togglePinActivity(activity.id, !isPinned);
                  onReload();
                }}
                className={`p-1.5 rounded flex-shrink-0 transition-all ${
                  isPinned
                    ? 'text-cult-warning hover:bg-cult-warning-muted'
                    : 'opacity-0 group-hover:opacity-100 text-cult-border hover:text-cult-warning hover:bg-cult-surface'
                }`}
                title={isPinned ? 'Unpin' : 'Pin to top'}
              >
                {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              </button>
            </div>
          );
        })}
        {activities.length === 0 && !showForm && (
          <div className="px-5 py-8 text-center text-sm text-cult-text-muted">
            No activity logged yet.
          </div>
        )}
      </div>
    </div>
  );
}

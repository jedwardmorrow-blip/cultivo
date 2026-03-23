import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { createTask } from '../services/tasks.service';
import type { TaskType, TaskPriority } from '../types';

interface TaskCreateModalProps {
  onClose: () => void;
  onCreated: () => void;
  prefilledCustomerId?: string;
}

interface CustomerOption {
  id: string;
  name: string;
  dispensary_code: string;
}

export function TaskCreateModal({ onClose, onCreated, prefilledCustomerId }: TaskCreateModalProps) {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_id: prefilledCustomerId || '',
    task_type: 'general' as TaskType,
    title: '',
    description: '',
    due_date: new Date().toISOString().split('T')[0],
    priority: 'medium' as TaskPriority,
  });

  useEffect(() => {
    async function loadCustomers() {
      const { data } = await supabase
        .from('customers')
        .select('id, name, dispensary_code')
        .order('name');
      if (data) setCustomers(data);
    }
    loadCustomers();
  }, []);

  const handleSubmit = async () => {
    if (!form.customer_id || !form.title.trim()) return;
    setSaving(true);
    await createTask({
      customer_id: form.customer_id,
      task_type: form.task_type,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      due_date: form.due_date,
      priority: form.priority,
    });
    setSaving(false);
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg w-full max-w-md mx-4">
        <div className="px-5 py-4 border-b border-cult-charcoal flex items-center justify-between">
          <h3 className="text-lg font-semibold text-cult-white">New Task</h3>
          <button onClick={onClose} className="text-cult-silver hover:text-cult-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-cult-silver mb-1">Account *</label>
            <select
              value={form.customer_id}
              onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-sm text-cult-white focus:outline-none focus:border-cult-lighter-gray"
            >
              <option value="">Select account...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.dispensary_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-cult-silver mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Task description"
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-sm text-cult-white placeholder-cult-silver focus:outline-none focus:border-cult-lighter-gray"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-cult-silver mb-1">Type</label>
              <select
                value={form.task_type}
                onChange={(e) => setForm({ ...form, task_type: e.target.value as TaskType })}
                className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-sm text-cult-white focus:outline-none focus:border-cult-lighter-gray"
              >
                <option value="general">General</option>
                <option value="callback">Callback</option>
                <option value="visit_reminder">Visit Reminder</option>
                <option value="sample_drop">Sample Drop</option>
                <option value="reorder_prompt">Reorder Prompt</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-cult-silver mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-sm text-cult-white focus:outline-none focus:border-cult-lighter-gray"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-cult-silver mb-1">Due Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-sm text-cult-white focus:outline-none focus:border-cult-lighter-gray"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-cult-silver mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional details"
              rows={2}
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-sm text-cult-white placeholder-cult-silver focus:outline-none focus:border-cult-lighter-gray resize-none"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-cult-charcoal flex items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={!form.customer_id || !form.title.trim() || saving}
            className="px-4 py-2 text-sm font-medium text-cult-black bg-cult-white rounded hover:bg-cult-off-white transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Task'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-cult-silver hover:text-cult-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

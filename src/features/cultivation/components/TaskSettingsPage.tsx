import { useState } from 'react';
import { Settings, Layout } from 'lucide-react';
import { TaskTypesOverlay } from './TaskTypesOverlay';
import { TemplateManager } from './TemplateManager';

type Tab = 'task-types' | 'templates';

export function TaskSettingsPage() {
  const [tab, setTab] = useState<Tab>('task-types');

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-3xl font-bold text-cult-text-primary">Task Settings</h1>
        <p className="text-cult-text-muted mt-1 text-sm sm:text-base">Manage task types and schedule templates</p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-cult-surface">
        <button
          type="button"
          onClick={() => setTab('task-types')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
            tab === 'task-types'
              ? 'border-cult-accent text-cult-text-primary'
              : 'border-transparent text-cult-border hover:text-cult-text-muted'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Task Types
        </button>
        <button
          type="button"
          onClick={() => setTab('templates')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
            tab === 'templates'
              ? 'border-cult-accent text-cult-text-primary'
              : 'border-transparent text-cult-border hover:text-cult-text-muted'
          }`}
        >
          <Layout className="w-3.5 h-3.5" />
          Templates
        </button>
      </div>

      {/* Content */}
      {tab === 'task-types' && <TaskTypesOverlay inline onClose={() => {}} />}
      {tab === 'templates' && (
        <div className="bg-cult-surface border border-cult-surface rounded-sm p-5">
          <TemplateManager inline onClose={() => {}} />
        </div>
      )}
    </div>
  );
}

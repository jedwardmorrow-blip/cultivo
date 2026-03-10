import { useState } from 'react'
import { Users, FileText, AlertTriangle, LayoutGrid } from 'lucide-react'
import AdminGate from '../components/AdminGate'
import UserList from '../components/admin/UserList'
import UserForm from '../components/admin/UserForm'
import AuditLog from '../components/admin/AuditLog'
import TeamOverview from '../components/admin/TeamOverview'
import {
  useAdminUsers,
  useAuditLog,
  AdminProfile,
  CreateUserPayload,
  UpdateUserPayload,
} from '../hooks/useAdminUsers'

type Tab = 'team' | 'users' | 'audit'

function AdminContent() {
  const { users, loading, error, createUser, updateUser } = useAdminUsers()
  const { entries, loading: auditLoading } = useAuditLog()

  const [activeTab, setActiveTab] = useState<Tab>('team')
  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminProfile | null>(null)

  function handleCreate() {
    setEditingUser(null)
    setFormOpen(true)
  }

  function handleEdit(user: AdminProfile) {
    setEditingUser(user)
    setFormOpen(true)
  }

  async function handleToggleActive(user: AdminProfile) {
    await updateUser({ user_id: user.id, is_active: !user.is_active })
  }

  async function handleSave(data: Record<string, unknown>) {
    if (editingUser) {
      await updateUser(data as unknown as UpdateUserPayload)
    } else {
      await createUser(data as unknown as CreateUserPayload)
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof Users; count?: number }[] = [
    { id: 'team', label: 'Team Overview', icon: LayoutGrid },
    { id: 'users', label: 'Users', icon: Users, count: users.length },
    { id: 'audit', label: 'Audit Log', icon: FileText, count: entries.length },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl text-cult-white tracking-wider">ADMIN</h1>
        <p className="text-xs font-mono text-cult-text mt-1">
          Manage users, permissions, and system activity
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-400/10 border border-red-400/20 rounded-md">
          <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
          <span className="text-xs font-mono text-red-400">{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-cult-border">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors ${
                active
                  ? 'border-cult-gold text-cult-gold'
                  : 'border-transparent text-cult-text hover:text-cult-white'
              }`}
            >
              <Icon size={13} />
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-sm ${
                    active
                      ? 'bg-cult-gold/20 text-cult-gold'
                      : 'bg-cult-border text-cult-text'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'team' && <TeamOverview />}
      {activeTab === 'users' && (
        <UserList
          users={users}
          loading={loading}
          onEdit={handleEdit}
          onCreate={handleCreate}
          onToggleActive={handleToggleActive}
        />
      )}
      {activeTab === 'audit' && <AuditLog entries={entries} loading={auditLoading} />}

      {/* User form modal */}
      {formOpen && (
        <UserForm
          user={editingUser}
          onSave={handleSave}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  )
}

export default function AdminPanel() {
  return (
    <AdminGate
      redirect
      fallback={
        <div className="flex items-center justify-center py-16">
          <div className="font-mono text-xs text-cult-text">Access denied</div>
        </div>
      }
    >
      <AdminContent />
    </AdminGate>
  )
}

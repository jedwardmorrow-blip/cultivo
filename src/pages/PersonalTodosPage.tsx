import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usePermissions } from '../hooks/usePermissions'
import { usePersonalTodos, useAllPersonalTodos } from '../hooks/usePersonalTodos'
import {
  Plus,
  Check,
  Trash2,
  Repeat,
  Calendar,
  ChevronDown,
  ChevronRight,
  Users,
  ListChecks,
  UserPlus,
} from 'lucide-react'
import type { PersonalTodo } from '../types'
import AssignTodoModal from '../components/admin/AssignTodoModal'

export default function PersonalTodosPage() {
  const { profile } = useAuth()
  const { canViewAllTodos } = usePermissions()
  const [showAdmin, setShowAdmin] = useState(false)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-cult-white tracking-wide">
            My Checklist
          </h1>
          <p className="text-xs font-mono text-cult-text mt-1">
            Personal daily tasks & recurring habits
          </p>
        </div>
        {canViewAllTodos && (
          <button
            onClick={() => setShowAdmin(!showAdmin)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono
              bg-cult-muted border border-cult-border text-cult-text hover:text-cult-white transition-colors"
          >
            <Users size={13} />
            {showAdmin ? 'My View' : 'Team View'}
          </button>
        )}
      </div>

      {showAdmin && canViewAllTodos ? <AdminTodoView /> : <MyTodoView />}
    </div>
  )
}

// ── Personal View ──
function MyTodoView() {
  const { todos, loading, addTodo, toggleComplete, dropTodo, isDone } =
    usePersonalTodos()
  const [newTitle, setNewTitle] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [showForm, setShowForm] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    await addTodo({
      title: newTitle.trim(),
      is_recurring: isRecurring,
      recurrence_pattern: isRecurring ? 'daily' : undefined,
      due_date: dueDate || undefined,
    })
    setNewTitle('')
    setIsRecurring(false)
    setDueDate('')
    setShowForm(false)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="font-mono text-xs text-cult-text animate-pulse">
          Loading...
        </div>
      </div>
    )
  }

  const recurring = todos.filter(t => t.is_recurring)
  const oneTime = todos.filter(t => !t.is_recurring && t.status !== 'complete')
  const completed = todos.filter(
    t => !t.is_recurring && t.status === 'complete'
  )

  return (
    <div className="space-y-6">
      {/* Add new button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-mono
            border border-dashed border-cult-border text-cult-text hover:text-cult-gold
            hover:border-cult-gold/40 transition-colors w-full justify-center"
        >
          <Plus size={14} />
          Add Item
        </button>
      )}

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-cult-dark border border-cult-border rounded-lg p-4 space-y-3"
        >
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full bg-cult-muted border border-cult-border rounded-md px-3 py-2
              text-sm text-cult-white placeholder:text-cult-text/50 focus:outline-none
              focus:border-cult-gold/50"
            autoFocus
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-cult-text cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={e => setIsRecurring(e.target.checked)}
                className="accent-cult-gold"
              />
              <Repeat size={12} />
              Daily recurring
            </label>
            {!isRecurring && (
              <label className="flex items-center gap-2 text-xs text-cult-text">
                <Calendar size={12} />
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="bg-cult-muted border border-cult-border rounded px-2 py-1 text-xs
                    text-cult-white focus:outline-none focus:border-cult-gold/50"
                />
              </label>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-3 py-1.5 bg-cult-gold/20 text-cult-gold border border-cult-gold/30
                rounded-md text-xs font-mono hover:bg-cult-gold/30 transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-cult-text text-xs font-mono hover:text-cult-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Daily Habits */}
      {recurring.length > 0 && (
        <TodoSection
          title="Daily Habits"
          icon={<Repeat size={12} className="text-cult-gold/70" />}
          count={`${recurring.filter(t => isDone(t)).length}/${recurring.length}`}
        >
          {recurring.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              done={isDone(todo)}
              onToggle={() => toggleComplete(todo.id)}
              onDrop={() => dropTodo(todo.id)}
            />
          ))}
        </TodoSection>
      )}

      {/* One-time tasks */}
      {oneTime.length > 0 && (
        <TodoSection
          title="Tasks"
          icon={<ListChecks size={12} className="text-cult-text/60" />}
          count={String(oneTime.length)}
        >
          {oneTime.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              done={false}
              onToggle={() => toggleComplete(todo.id)}
              onDrop={() => dropTodo(todo.id)}
            />
          ))}
        </TodoSection>
      )}

      {/* Completed (collapsible) */}
      {completed.length > 0 && (
        <CompletedSection todos={completed} onToggle={toggleComplete} />
      )}

      {/* Empty state */}
      {todos.length === 0 && (
        <div className="text-center py-16">
          <ListChecks
            size={32}
            className="text-cult-text/30 mx-auto mb-3"
          />
          <p className="text-sm text-cult-text/60 font-mono">
            No items yet. Add your first task or daily habit.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Admin Team View ──
function AdminTodoView() {
  const { allTodos, loading, refresh } = useAllPersonalTodos()
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignToUser, setAssignToUser] = useState<string | undefined>()

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="font-mono text-xs text-cult-text animate-pulse">
          Loading team data...
        </div>
      </div>
    )
  }

  // Group by owner
  const grouped = allTodos.reduce(
    (acc, todo) => {
      const name = todo.profiles?.full_name || 'Unknown'
      const ownerId = todo.owner_id
      if (!acc[ownerId]) acc[ownerId] = { name, todos: [] }
      acc[ownerId].todos.push(todo)
      return acc
    },
    {} as Record<string, { name: string; todos: PersonalTodo[] }>
  )

  function openAssignFor(userId?: string) {
    setAssignToUser(userId)
    setShowAssignModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Global assign button */}
      <button
        onClick={() => openAssignFor()}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-mono
          border border-dashed border-cult-gold/30 text-cult-gold hover:bg-cult-gold/10
          transition-colors w-full justify-center"
      >
        <UserPlus size={14} />
        Assign Task to Team Member
      </button>

      {Object.entries(grouped).map(([ownerId, { name, todos: userTodos }]) => {
        const doneCount = userTodos.filter(t => {
          if (t.is_recurring) return t.completed_today
          return t.status === 'complete'
        }).length
        return (
          <div
            key={ownerId}
            className="bg-cult-dark border border-cult-border rounded-lg overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-cult-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-cult-gold/20 border border-cult-gold/30 flex items-center justify-center">
                  <span className="text-[8px] font-mono text-cult-gold font-medium">
                    {name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </span>
                </div>
                <span className="text-sm text-cult-white font-medium">
                  {name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-cult-text">
                  {doneCount}/{userTodos.length} done
                </span>
                <button
                  onClick={() => openAssignFor(ownerId)}
                  className="text-cult-text hover:text-cult-gold transition-colors"
                  title={`Assign task to ${name}`}
                >
                  <UserPlus size={13} />
                </button>
              </div>
            </div>
            <div className="divide-y divide-cult-border/50">
              {userTodos.map(todo => {
                const done = todo.is_recurring
                  ? todo.completed_today
                  : todo.status === 'complete'
                return (
                  <div
                    key={todo.id}
                    className={`flex items-center gap-3 px-4 py-2.5 ${done ? 'opacity-40' : ''}`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        done
                          ? 'bg-cult-gold/20 border-cult-gold/40'
                          : 'border-cult-border'
                      }`}
                    >
                      {done && <Check size={10} className="text-cult-gold" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-xs ${
                          done
                            ? 'text-cult-text line-through'
                            : 'text-cult-white'
                        }`}
                      >
                        {todo.title}
                      </span>
                      {todo.assigned_by_profile && (
                        <span className="ml-2 text-[9px] font-mono text-cult-text/40">
                          assigned by {todo.assigned_by_profile.full_name.split(' ')[0]}
                        </span>
                      )}
                    </div>
                    {todo.priority && todo.priority !== 'medium' && (
                      <span className={`px-1.5 py-0.5 text-[8px] font-mono tracking-wider rounded-sm border flex-shrink-0 ${
                        todo.priority === 'critical' ? 'text-cult-red-bright bg-cult-red-bright/10 border-cult-red-bright/30' :
                        todo.priority === 'high' ? 'text-cult-amber-bright bg-cult-amber-bright/10 border-cult-amber-bright/30' :
                        'text-cult-text/60 bg-cult-dark border-cult-border/50'
                      }`}>
                        {todo.priority.toUpperCase()}
                      </span>
                    )}
                    {todo.is_recurring && (
                      <Repeat size={10} className="text-cult-text/40" />
                    )}
                    {todo.due_date && (
                      <span className="text-[10px] font-mono text-cult-text/50">
                        {todo.due_date}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {Object.keys(grouped).length === 0 && (
        <div className="text-center py-16">
          <Users size={32} className="text-cult-text/30 mx-auto mb-3" />
          <p className="text-sm text-cult-text/60 font-mono">
            No team members have created personal todos yet.
          </p>
        </div>
      )}

      {showAssignModal && (
        <AssignTodoModal
          onClose={() => setShowAssignModal(false)}
          onAssigned={() => refresh?.()}
          preselectedUserId={assignToUser}
        />
      )}
    </div>
  )
}

// ── Shared Components ──

function TodoSection({
  title,
  icon,
  count,
  children,
}: {
  title: string
  icon: React.ReactNode
  count: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        {icon}
        <span className="text-[10px] font-mono text-cult-text/60 tracking-wider uppercase">
          {title}
        </span>
        <span className="text-[10px] font-mono text-cult-text/40">
          ({count})
        </span>
      </div>
      <div className="bg-cult-dark border border-cult-border rounded-lg divide-y divide-cult-border/50 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function TodoItem({
  todo,
  done,
  onToggle,
  onDrop,
}: {
  todo: PersonalTodo
  done: boolean
  onToggle: () => void
  onDrop?: () => void
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 group transition-colors hover:bg-cult-muted/20 ${
        done ? 'opacity-50' : ''
      }`}
    >
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
          done
            ? 'bg-cult-gold/20 border-cult-gold/40'
            : 'border-cult-border hover:border-cult-gold/40'
        }`}
      >
        {done && <Check size={12} className="text-cult-gold" />}
      </button>
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm ${
            done ? 'text-cult-text line-through' : 'text-cult-white'
          }`}
        >
          {todo.title}
        </span>
        {todo.assigned_by_profile && (
          <p className="text-[9px] font-mono text-cult-gold/50 mt-0.5">
            assigned by {todo.assigned_by_profile.full_name.split(' ')[0]}
          </p>
        )}
        {todo.description && !todo.assigned_by_profile && (
          <p className="text-[10px] text-cult-text/50 mt-0.5 truncate">
            {todo.description}
          </p>
        )}
      </div>
      {todo.is_recurring && (
        <Repeat size={11} className="text-cult-gold/40 flex-shrink-0" />
      )}
      {todo.due_date && !todo.is_recurring && (
        <span className="text-[10px] font-mono text-cult-text/50 flex-shrink-0">
          {todo.due_date}
        </span>
      )}
      {onDrop && (
        <button
          onClick={onDrop}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-cult-text hover:text-cult-red-bright"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  )
}

function CompletedSection({
  todos,
  onToggle,
}: {
  todos: PersonalTodo[]
  onToggle: (id: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 mb-2 px-1 text-cult-text/40 hover:text-cult-text transition-colors"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="text-[10px] font-mono tracking-wider uppercase">
          Completed ({todos.length})
        </span>
      </button>
      {open && (
        <div className="bg-cult-dark border border-cult-border rounded-lg divide-y divide-cult-border/50 overflow-hidden">
          {todos.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              done={true}
              onToggle={() => onToggle(todo.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

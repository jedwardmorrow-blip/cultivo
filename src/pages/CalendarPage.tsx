import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { usePermissions } from '../hooks/usePermissions'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Circle,
  CheckCircle2,
  Users,
  User,
  Filter,
} from 'lucide-react'
import type { PersonalTodo, Todo } from '../types'

interface DayTodo {
  id: string
  title: string
  type: 'personal' | 'team'
  status: string
  completed: boolean
  due_date: string
  owner_id: string
  owner_name: string
  priority?: string
  is_recurring?: boolean
}

// Color palette for team members (distinct, accessible on dark bg)
const MEMBER_COLORS = [
  { dot: 'bg-cult-gold', text: 'text-cult-gold', border: 'border-cult-gold/40', bg: 'bg-cult-gold/20' },
  { dot: 'bg-cyan-400', text: 'text-cyan-400', border: 'border-cyan-400/40', bg: 'bg-cyan-400/20' },
  { dot: 'bg-purple-400', text: 'text-purple-400', border: 'border-purple-400/40', bg: 'bg-purple-400/20' },
  { dot: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-400/40', bg: 'bg-emerald-400/20' },
  { dot: 'bg-rose-400', text: 'text-rose-400', border: 'border-rose-400/40', bg: 'bg-rose-400/20' },
  { dot: 'bg-amber-300', text: 'text-amber-300', border: 'border-amber-300/40', bg: 'bg-amber-300/20' },
]

export default function CalendarPage() {
  const { user } = useAuth()
  const { canViewAllTodos } = usePermissions()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [personalTodos, setPersonalTodos] = useState<PersonalTodo[]>([])
  const [teamTodos, setTeamTodos] = useState<Todo[]>([])
  const [completionTodoIds, setCompletionTodoIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [teamView, setTeamView] = useState(false)
  const [filterUser, setFilterUser] = useState<string | 'all'>('all')

  function todayStr() {
    return new Date().toISOString().slice(0, 10)
  }

  // Fetch todos from Supabase
  const fetchTodos = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)

      // Always fetch today's completions for recurring items
      const completionsPromise = supabase
        .from('personal_todo_completions')
        .select('todo_id')
        .eq('completed_date', todayStr())

      if (teamView && canViewAllTodos) {
        // Admin team view: fetch ALL users' todos
        const [personalRes, teamRes, completionsRes] = await Promise.all([
          supabase
            .from('personal_todos')
            .select('*, profiles(id, full_name, avatar_url)')
            .neq('status', 'dropped'),
          supabase
            .from('todos')
            .select('*, profiles(id, full_name, avatar_url)')
            .neq('status', 'dropped'),
          completionsPromise,
        ])

        if (personalRes.error) throw personalRes.error
        if (teamRes.error) throw teamRes.error

        const completedIds = new Set((completionsRes.data || []).map(c => c.todo_id))
        setCompletionTodoIds(completedIds)

        const enriched = (personalRes.data || []).map(t => ({
          ...t,
          completed_today: completedIds.has(t.id),
        })) as PersonalTodo[]
        setPersonalTodos(enriched)
        setTeamTodos(teamRes.data || [])
      } else {
        // Personal view: only current user
        const [personalRes, teamRes, completionsRes] = await Promise.all([
          supabase
            .from('personal_todos')
            .select('*, profiles(id, full_name, avatar_url)')
            .eq('owner_id', user.id)
            .neq('status', 'dropped'),
          supabase
            .from('todos')
            .select('*, profiles(id, full_name, avatar_url)')
            .eq('owner_id', user.id)
            .neq('status', 'dropped'),
          completionsPromise,
        ])

        if (personalRes.error) throw personalRes.error
        if (teamRes.error) throw teamRes.error

        const completedIds = new Set((completionsRes.data || []).map(c => c.todo_id))
        setCompletionTodoIds(completedIds)

        const enriched = (personalRes.data || []).map(t => ({
          ...t,
          completed_today: completedIds.has(t.id),
        })) as PersonalTodo[]
        setPersonalTodos(enriched)
        setTeamTodos(teamRes.data || [])
      }
    } catch (error) {
      console.error('Error fetching todos:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id, teamView, canViewAllTodos])

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  // Realtime subscriptions
  useEffect(() => {
    if (!user?.id) return

    const personalFilter = teamView && canViewAllTodos
      ? {}
      : { filter: `owner_id=eq.${user.id}` }

    const teamFilter = teamView && canViewAllTodos
      ? {}
      : { filter: `owner_id=eq.${user.id}` }

    const channel = supabase
      .channel('calendar-todos-' + (teamView ? 'team' : 'personal'))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'personal_todos', ...personalFilter },
        () => fetchTodos()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos', ...teamFilter },
        () => fetchTodos()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'personal_todo_completions' },
        () => fetchTodos()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, fetchTodos, teamView, canViewAllTodos])

  // Build member color map
  const memberColorMap = useMemo(() => {
    const map = new Map<string, typeof MEMBER_COLORS[0]>()
    const allOwnerIds = new Set<string>([
      ...personalTodos.map(t => t.owner_id),
      ...teamTodos.map(t => t.owner_id).filter((id): id is string => !!id),
    ])
    let idx = 0
    allOwnerIds.forEach(id => {
      map.set(id, MEMBER_COLORS[idx % MEMBER_COLORS.length])
      idx++
    })
    return map
  }, [personalTodos, teamTodos])

  // Build unique member list for filter dropdown
  const teamMembers = useMemo(() => {
    const map = new Map<string, string>()
    personalTodos.forEach(t => {
      if (t.profiles?.full_name) map.set(t.owner_id, t.profiles.full_name)
    })
    teamTodos.forEach(t => {
      if (t.owner_id && t.profiles?.full_name) map.set(t.owner_id, t.profiles.full_name)
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [personalTodos, teamTodos])

  // Get todos for a specific date
  const getTodosForDate = useCallback(
    (date: Date): DayTodo[] => {
      const dateStr = date.toISOString().split('T')[0]

      const personalForDate: DayTodo[] = personalTodos
        .filter((t) => t.due_date === dateStr)
        .filter((t) => filterUser === 'all' || t.owner_id === filterUser)
        .map((t) => ({
          id: t.id,
          title: t.title,
          type: 'personal' as const,
          status: t.status,
          completed: t.is_recurring ? (t.completed_today || false) : t.status === 'complete',
          due_date: t.due_date!,
          owner_id: t.owner_id,
          owner_name: t.profiles?.full_name || 'Unknown',
          priority: (t as any).priority || undefined,
          is_recurring: t.is_recurring || false,
        }))

      const teamForDate: DayTodo[] = teamTodos
        .filter((t) => t.due_date === dateStr)
        .filter((t) => filterUser === 'all' || t.owner_id === filterUser)
        .map((t) => ({
          id: t.id,
          title: t.title,
          type: 'team' as const,
          status: t.status,
          completed: t.status === 'complete',
          due_date: t.due_date!,
          owner_id: t.owner_id || '',
          owner_name: t.profiles?.full_name || t.assignee_name || 'Unknown',
          priority: (t as any).priority || undefined,
        }))

      return [...personalForDate, ...teamForDate]
    },
    [personalTodos, teamTodos, filterUser]
  )

  // Check if date has todos (for dot indicators)
  const getDotsForDate = useCallback(
    (date: Date): { color: string; ownerId: string }[] => {
      const dateStr = date.toISOString().split('T')[0]
      const ownerIds = new Set<string>()

      personalTodos
        .filter((t) => t.due_date === dateStr)
        .filter((t) => filterUser === 'all' || t.owner_id === filterUser)
        .forEach(t => ownerIds.add(t.owner_id))

      teamTodos
        .filter((t) => t.due_date === dateStr)
        .filter((t) => filterUser === 'all' || t.owner_id === filterUser)
        .forEach(t => { if (t.owner_id) ownerIds.add(t.owner_id) })

      return Array.from(ownerIds).slice(0, 4).map(id => ({
        color: memberColorMap.get(id)?.dot || 'bg-cult-gold',
        ownerId: id,
      }))
    },
    [personalTodos, teamTodos, filterUser, memberColorMap]
  )

  // Calendar calculations
  const calendarDays = useMemo(() => {
    const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const start = new Date(first)
    start.setDate(start.getDate() - first.getDay())

    const days: Date[] = []
    const current = new Date(start)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return days
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate.getFullYear(), currentDate.getMonth()])

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const handleToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth()
  }

  const isSameDay = (date1: Date, date2: Date | null): boolean => {
    if (!date2) return false
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  }

  const monthName = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(currentDate)

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const selectedDayTodos = selectedDate ? getTodosForDate(selectedDate) : []

  // Group selected day todos by owner for team view
  const groupedTodos = useMemo(() => {
    if (!teamView) return null
    const map = new Map<string, { name: string; todos: DayTodo[] }>()
    selectedDayTodos.forEach(todo => {
      if (!map.has(todo.owner_id)) {
        map.set(todo.owner_id, { name: todo.owner_name, todos: [] })
      }
      map.get(todo.owner_id)!.todos.push(todo)
    })
    return map
  }, [selectedDayTodos, teamView])

  const PRIORITY_COLORS: Record<string, string> = {
    critical: 'text-cult-red-bright',
    high: 'text-cult-amber-bright',
    medium: 'text-cult-text',
    low: 'text-cult-text/60',
  }

  // Toggle completion for a todo from the calendar detail panel
  const toggleTodoComplete = useCallback(async (todo: DayTodo) => {
    try {
      if (todo.type === 'personal') {
        if (todo.is_recurring) {
          // Recurring personal: toggle today's completion record
          if (todo.completed) {
            await supabase
              .from('personal_todo_completions')
              .delete()
              .eq('todo_id', todo.id)
              .eq('completed_date', todayStr())
          } else {
            await supabase
              .from('personal_todo_completions')
              .insert({ todo_id: todo.id, completed_date: todayStr() })
          }
        } else {
          // One-time personal: toggle status
          if (todo.completed) {
            await supabase
              .from('personal_todos')
              .update({ status: 'pending', completed_at: null, updated_at: new Date().toISOString() })
              .eq('id', todo.id)
          } else {
            await supabase
              .from('personal_todos')
              .update({ status: 'complete', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
              .eq('id', todo.id)
          }
        }
      } else {
        // Team todo: toggle status
        if (todo.completed) {
          await supabase
            .from('todos')
            .update({ status: 'open', completed_at: null, updated_at: new Date().toISOString() })
            .eq('id', todo.id)
        } else {
          await supabase
            .from('todos')
            .update({ status: 'complete', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', todo.id)
        }
      }
      // Refresh after toggle — realtime will also catch it but immediate refresh feels better
      fetchTodos()
    } catch (error) {
      console.error('Error toggling todo completion:', error)
    }
  }, [fetchTodos])

  return (
    <div className="flex h-full gap-6">
      {/* Calendar Section */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <h1 className="font-display text-2xl text-cult-white tracking-wide">Calendar</h1>
            {canViewAllTodos && (
              <button
                onClick={() => { setTeamView(!teamView); setFilterUser('all') }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono
                  bg-cult-muted border border-cult-border text-cult-text hover:text-cult-white transition-colors"
              >
                {teamView ? <User size={13} /> : <Users size={13} />}
                {teamView ? 'My Calendar' : 'Team Calendar'}
              </button>
            )}
          </div>
          <p className="text-xs font-mono text-cult-text mt-1 mb-4">
            {teamView ? 'All team members\' todos & deadlines' : 'Upcoming todos & deadlines'}
          </p>

          {/* Controls */}
          <div className="flex items-center justify-between bg-cult-dark rounded-lg p-3 border border-cult-border">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-cult-muted rounded transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} className="text-cult-gold" />
              </button>

              <h2 className="font-display text-lg text-cult-white min-w-[180px] text-center">
                {monthName}
              </h2>

              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-cult-muted rounded transition-colors"
                aria-label="Next month"
              >
                <ChevronRight size={16} className="text-cult-gold" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Member filter (team view only) */}
              {teamView && teamMembers.length > 1 && (
                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-cult-muted border border-cult-border rounded-md">
                  <Filter size={11} className="text-cult-text" />
                  <select
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                    className="bg-transparent text-xs font-mono text-cult-white outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-cult-dark">All Members</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id} className="bg-cult-dark">
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleToday}
                className="flex items-center gap-2 px-3 py-1.5 bg-cult-gold/20 text-cult-gold
                  border border-cult-gold/30 rounded-md text-xs font-mono
                  hover:bg-cult-gold/30 transition-colors"
              >
                <Calendar size={12} />
                Today
              </button>
            </div>
          </div>
        </div>

        {/* Team legend (team view only) */}
        {teamView && teamMembers.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-3 px-1">
            {teamMembers
              .filter(m => filterUser === 'all' || m.id === filterUser)
              .map(m => {
                const color = memberColorMap.get(m.id)
                return (
                  <div key={m.id} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${color?.dot || 'bg-cult-gold'}`} />
                    <span className="text-[10px] font-mono text-cult-text">
                      {m.name.split(' ')[0]}
                    </span>
                  </div>
                )
              })}
          </div>
        )}

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center font-mono text-[10px] uppercase tracking-wider text-cult-text/60 py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 flex-1">
          {calendarDays.map((date, index) => {
            const isOtherMonth = !isCurrentMonth(date)
            const isTodayDate = isToday(date)
            const isSelected = isSameDay(date, selectedDate)
            const dots = getDotsForDate(date)

            return (
              <button
                key={index}
                onClick={() => setSelectedDate(new Date(date))}
                className={`
                  relative min-h-[72px] p-2 rounded-md border transition-all
                  flex flex-col items-start justify-between
                  ${isTodayDate
                    ? 'border-cult-gold bg-cult-muted'
                    : isSelected
                      ? 'border-cult-gold/60 bg-cult-dark'
                      : 'border-cult-border bg-cult-dark hover:bg-cult-muted/50'
                  }
                  ${isOtherMonth ? 'opacity-25' : ''}
                `}
              >
                <span
                  className={`font-mono text-[11px] font-medium ${
                    isOtherMonth
                      ? 'text-cult-text'
                      : isTodayDate
                        ? 'text-cult-gold'
                        : 'text-cult-white'
                  }`}
                >
                  {date.getDate()}
                </span>

                {/* Indicator dots */}
                <div className="flex gap-1 flex-wrap">
                  {dots.map((d, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${d.color}`} />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedDate && (
        <div className="w-80 flex-shrink-0 flex flex-col bg-cult-dark border border-cult-border rounded-lg overflow-hidden">
          {/* Detail Header */}
          <div className="bg-cult-muted border-b border-cult-border px-4 py-3">
            <h3 className="font-display text-sm text-cult-white tracking-wide">
              {new Intl.DateTimeFormat('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              }).format(selectedDate)}
            </h3>
            <p className="text-cult-text text-[10px] font-mono mt-0.5">
              {selectedDayTodos.length} item{selectedDayTodos.length !== 1 ? 's' : ''}
              {teamView && filterUser === 'all' && groupedTodos
                ? ` · ${groupedTodos.size} member${groupedTodos.size !== 1 ? 's' : ''}`
                : ''
              }
            </p>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {selectedDayTodos.length === 0 ? (
              <div className="text-center py-8">
                <Calendar size={24} className="text-cult-text/30 mx-auto mb-2" />
                <p className="text-cult-text/50 text-xs font-mono">
                  Nothing scheduled
                </p>
              </div>
            ) : teamView && groupedTodos ? (
              // Team view: group by owner
              Array.from(groupedTodos.entries()).map(([ownerId, group]) => {
                const color = memberColorMap.get(ownerId)
                return (
                  <div key={ownerId} className="mb-3 last:mb-0">
                    <div className="flex items-center gap-2 mb-1.5 px-1">
                      <div className={`w-5 h-5 rounded-full ${color?.bg || 'bg-cult-gold/20'} ${color?.border || 'border-cult-gold/30'} border flex items-center justify-center`}>
                        <span className={`text-[7px] font-mono font-bold ${color?.text || 'text-cult-gold'}`}>
                          {group.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-cult-text tracking-wider">
                        {group.name}
                      </span>
                    </div>
                    {group.todos.map(todo => (
                      <TodoDetailItem
                        key={todo.id}
                        todo={todo}
                        color={color}
                        priorityColors={PRIORITY_COLORS}
                        showOwner={false}
                        onToggle={toggleTodoComplete}
                      />
                    ))}
                  </div>
                )
              })
            ) : (
              // Personal view: flat list
              selectedDayTodos.map((todo) => (
                <TodoDetailItem
                  key={todo.id}
                  todo={todo}
                  color={memberColorMap.get(todo.owner_id)}
                  priorityColors={PRIORITY_COLORS}
                  showOwner={false}
                  onToggle={toggleTodoComplete}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TodoDetailItem({
  todo,
  color,
  priorityColors,
  showOwner,
  onToggle,
}: {
  todo: DayTodo
  color?: typeof MEMBER_COLORS[0]
  priorityColors: Record<string, string>
  showOwner: boolean
  onToggle?: (todo: DayTodo) => void
}) {
  return (
    <div
      className={`
        flex items-start gap-2.5 px-3 py-2.5 rounded-md
        border border-cult-border/50 bg-cult-black/50
        ${todo.completed ? 'opacity-40' : ''}
      `}
    >
      <button
        onClick={() => onToggle?.(todo)}
        className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform"
        title={todo.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {todo.completed ? (
          <CheckCircle2 size={13} className={color?.text || 'text-cult-gold'} />
        ) : (
          <Circle size={13} className={`${color?.text || 'text-cult-gold'} hover:opacity-70`} />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={`text-xs ${
            todo.completed
              ? 'text-cult-text line-through'
              : 'text-cult-white'
          }`}
        >
          {todo.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className={`text-[9px] font-mono inline-block ${
              color?.text
                ? `${color.text}/60`
                : todo.type === 'personal'
                  ? 'text-cult-gold/60'
                  : 'text-cyan-400/60'
            }`}
          >
            {todo.type === 'personal' ? 'Personal' : 'Team'}
          </span>
          {todo.priority && todo.priority !== 'medium' && (
            <span className={`text-[9px] font-mono uppercase ${priorityColors[todo.priority] || ''}`}>
              {todo.priority}
            </span>
          )}
          {showOwner && (
            <span className="text-[9px] font-mono text-cult-text/40">
              {todo.owner_name.split(' ')[0]}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

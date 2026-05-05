import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Goal, Rock, Todo, Issue } from '../types'
import { Target, CheckSquare, AlertCircle, TrendingUp, ArrowRight, Circle } from 'lucide-react'
import ClaudeRecommendations from '../components/ClaudeRecommendations'
import { format, differenceInDays, parseISO } from 'date-fns'

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', cls: 'text-cult-text', dot: 'bg-cult-muted' },
  in_progress: { label: 'In Progress', cls: 'text-cult-amber-bright', dot: 'bg-cult-amber-bright' },
  completed: { label: 'Done', cls: 'text-cult-green-bright', dot: 'bg-cult-green-bright' },
  at_risk: { label: 'At Risk', cls: 'text-cult-danger-bright', dot: 'bg-cult-danger-bright' },
}

const PHASE_COLORS = {
  1: 'bg-cult-gold/10 text-cult-gold border-cult-gold/30',
  2: 'bg-cult-info-muted text-cult-info border-cult-info/30',
  3: 'bg-purple-900/20 text-purple-300 border-purple-700/30',
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [rocks, setRocks] = useState<Rock[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [northStar, setNorthStar] = useState<string>('')
  const [planDates, setPlanDates] = useState<{ start: string; end: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile) fetchAll() }, [profile])

  async function fetchAll() {
    if (!profile) return
    setLoading(true)
    const [plansRes, goalsRes, rocksRes, todosRes, issuesRes] = await Promise.all([
      supabase.from('plans').select('*').eq('profile_id', profile.id).eq('status', 'active').single(),
      supabase.from('goals').select('*').eq('profile_id', profile.id).order('phase').limit(6),
      supabase.from('rocks').select('*').eq('owner_id', profile.id).order('created_at').limit(5),
      supabase.from('todos').select('*').eq('owner_id', profile.id).eq('status', 'open').order('due_date').limit(5),
      supabase.from('issues').select('*').eq('owner_id', profile.id).eq('status', 'open').order('priority').limit(5),
    ])
    if (plansRes.data) { setNorthStar(plansRes.data.north_star); setPlanDates({ start: plansRes.data.start_date, end: plansRes.data.end_date }) }
    setGoals(goalsRes.data || [])
    setRocks(rocksRes.data || [])
    setTodos(todosRes.data || [])
    setIssues(issuesRes.data || [])
    setLoading(false)
  }

  const daysLeft = planDates ? differenceInDays(parseISO(planDates.end), new Date()) : null
  const completedGoals = goals.filter(g => g.status === 'completed').length
  const progressPct = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0
  const firstName = profile?.full_name?.split(' ')[0] || ''
  const greeting = () => { const h = new Date().getHours(); if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening' }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="font-mono text-xs text-cult-text tracking-widest animate-pulse">LOADING...</div></div>

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-cult-text tracking-widest uppercase mb-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          <h1 className="font-display text-4xl tracking-wider text-cult-text-primary">{greeting()}, {firstName.toUpperCase()}</h1>
        </div>
        {daysLeft !== null && (
          <div className="text-right">
            <div className="font-display text-4xl text-cult-gold">{daysLeft}</div>
            <div className="font-mono text-xs text-cult-text tracking-wider">DAYS REMAINING</div>
          </div>
        )}
      </div>

      {northStar && (
        <div className="card p-5 border-cult-gold/30 bg-cult-gold/5">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-sm bg-cult-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Target size={16} className="text-cult-gold" />
            </div>
            <div>
              <div className="font-mono text-xs tracking-[0.3em] text-cult-gold/70 uppercase mb-1">North Star · Q1 2026</div>
              <p className="text-cult-text-primary text-sm leading-relaxed">{northStar}</p>
            </div>
          </div>
        </div>
      )}

      {goals.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-cult-text tracking-wider uppercase">90-Day Progress</span>
            <span className="font-mono text-xs text-cult-gold">{completedGoals}/{goals.length} goals complete</span>
          </div>
          <div className="h-1.5 bg-cult-muted rounded-full overflow-hidden">
            <div className="h-full bg-cult-gold rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      <ClaudeRecommendations maxItems={4} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Open Goals', value: goals.filter(g => g.status !== 'completed').length, icon: Target, color: 'text-cult-gold' },
          { label: 'Active Rocks', value: rocks.filter(r => r.status !== 'complete').length, icon: TrendingUp, color: 'text-cult-info' },
          { label: 'Open To-Dos', value: todos.length, icon: CheckSquare, color: 'text-cult-green-bright' },
          { label: 'Open Issues', value: issues.length, icon: AlertCircle, color: 'text-cult-danger-bright' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <Icon size={16} className={`${color} mb-3`} />
            <div className={`font-display text-3xl ${color} mb-1`}>{value}</div>
            <div className="font-mono text-xs text-cult-text tracking-wider uppercase">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-xs text-cult-text tracking-wider uppercase">Active Goals</span>
            <Link to="/plan" className="text-cult-gold text-xs font-mono hover:underline flex items-center gap-1">View all <ArrowRight size={10} /></Link>
          </div>
          <div className="space-y-2">
            {goals.filter(g => g.status !== 'completed').slice(0, 5).map(goal => {
              const s = STATUS_CONFIG[goal.status]
              return (
                <div key={goal.id} className="flex items-start gap-3 py-2 border-b border-cult-border/50 last:border-0">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-cult-text-primary leading-snug">{goal.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`phase-pill border ${PHASE_COLORS[goal.phase]} text-xs`}>Day {goal.phase === 1 ? '1-30' : goal.phase === 2 ? '31-60' : '61-90'}</span>
                      <span className={`font-mono text-xs ${s.cls}`}>{s.label}</span>
                    </div>
                  </div>
                </div>
              )
            })}
            {goals.filter(g => g.status !== 'completed').length === 0 && <p className="text-cult-text text-xs font-mono text-center py-4">All goals complete</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs text-cult-text tracking-wider uppercase">To-Dos</span>
              <Link to="/todos" className="text-cult-gold text-xs font-mono hover:underline flex items-center gap-1">View all <ArrowRight size={10} /></Link>
            </div>
            <div className="space-y-2">
              {todos.slice(0, 3).map(todo => (
                <div key={todo.id} className="flex items-center gap-2">
                  <Circle size={12} className="text-cult-border flex-shrink-0" />
                  <span className="text-xs text-cult-text-primary flex-1 truncate">{todo.title}</span>
                  {todo.due_date && <span className="font-mono text-xs text-cult-text flex-shrink-0">{format(parseISO(todo.due_date), 'MMM d')}</span>}
                </div>
              ))}
              {todos.length === 0 && <p className="text-cult-text text-xs font-mono text-center py-2">No open to-dos</p>}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs text-cult-text tracking-wider uppercase">Open Issues</span>
              <Link to="/issues" className="text-cult-gold text-xs font-mono hover:underline flex items-center gap-1">View all <ArrowRight size={10} /></Link>
            </div>
            <div className="space-y-2">
              {issues.slice(0, 3).map(issue => {
                const priorityColors: Record<string, string> = { critical: 'text-cult-danger-bright', high: 'text-cult-amber-bright', medium: 'text-cult-text', low: 'text-cult-text/60' }
                return (
                  <div key={issue.id} className="flex items-center gap-2">
                    <AlertCircle size={12} className={priorityColors[issue.priority]} />
                    <span className="text-xs text-cult-text-primary flex-1 truncate">{issue.title}</span>
                    <span className={`font-mono text-xs uppercase ${priorityColors[issue.priority]}`}>{issue.priority}</span>
                  </div>
                )
              })}
              {issues.length === 0 && <p className="text-cult-text text-xs font-mono text-center py-2">No open issues</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
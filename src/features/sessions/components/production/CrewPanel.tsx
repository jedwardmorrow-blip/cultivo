/**
 * CrewPanel — Bento card showing active staff and their assignments
 *
 * Compact: staff count + assignment summary
 * Expanded: full crew list with current session details
 */

import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { GLASS, GLASS_ELEVATED, GLASS_HOVER, SESSION_TYPE_COLORS, fadeInVariants } from './constants';
import type { NormalizedSession } from './constants';
import type { ActiveStaffMember } from '../../hooks/useActiveStaff';

// ─── Helpers ──────────────────────────────────────────────────────────────

interface CrewMember {
  id: string;
  name: string;
  currentSession: NormalizedSession | null;
}

function buildCrewList(staff: ActiveStaffMember[], sessions: NormalizedSession[], getDisplayName: (m: ActiveStaffMember) => string): CrewMember[] {
  return staff.map(s => ({
    id: s.id,
    name: getDisplayName(s),
    currentSession: sessions.find(sess => {
      // Match by worker name (sessions store names, not IDs)
      const sessionWorker = sess.worker.toLowerCase();
      const staffName = s.first_name.toLowerCase();
      return sessionWorker.startsWith(staffName);
    }) || null,
  }));
}

// ─── Compact view ─────────────────────────────────────────────────────────

interface CrewPanelCompactProps {
  staff: ActiveStaffMember[];
  sessions: NormalizedSession[];
  getDisplayName: (m: ActiveStaffMember) => string;
  isActive: boolean;
  onClick: () => void;
}

export function CrewPanelCompact({ staff, sessions, getDisplayName, isActive, onClick }: CrewPanelCompactProps) {
  const crew = buildCrewList(staff, sessions, getDisplayName);
  const working = crew.filter(c => c.currentSession);
  const idle = crew.filter(c => !c.currentSession);

  return (
    <motion.button
      layoutId="card-crew"
      layout="position"
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      type="button"
      onClick={onClick}
      className={`${isActive ? GLASS_ELEVATED : GLASS} ${GLASS_HOVER} w-full text-left active:scale-[0.98] ${
        isActive ? 'py-2.5 px-4' : 'p-4'
      }`}
    >
      {isActive ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-sky-400/60" />
            <h3 className="text-[11px] text-sky-400/60 uppercase tracking-widest font-medium">Crew</h3>
          </div>
          <span className="text-[9px] text-white/20">● active</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400/50" />
              <h3 className="text-[11px] text-white/40 uppercase tracking-widest font-medium">Crew</h3>
            </div>
            <span className="text-xs text-white/30">
              {working.length}/{crew.length}
            </span>
          </div>

          <div className="space-y-1.5">
            {crew.slice(0, 5).map(c => {
              const typeColor = c.currentSession ? SESSION_TYPE_COLORS[c.currentSession.type] : null;
              return (
                <div key={c.id} className="flex items-center justify-between text-xs">
                  <span className={c.currentSession ? 'text-white/60' : 'text-white/25'}>{c.name}</span>
                  <div className="flex items-center gap-1.5">
                    {c.currentSession ? (
                      <>
                        <span className="text-white/30 truncate max-w-[80px]">
                          {typeColor?.label}
                        </span>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      </>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full border border-white/20" />
                    )}
                  </div>
                </div>
              );
            })}
            {crew.length > 5 && (
              <span className="text-[10px] text-white/20">+{crew.length - 5} more</span>
            )}
          </div>
        </>
      )}
    </motion.button>
  );
}

// ─── Expanded view ────────────────────────────────────────────────────────

interface CrewPanelExpandedProps {
  staff: ActiveStaffMember[];
  sessions: NormalizedSession[];
  getDisplayName: (m: ActiveStaffMember) => string;
}

export function CrewPanelExpanded({ staff, sessions, getDisplayName }: CrewPanelExpandedProps) {
  const crew = buildCrewList(staff, sessions, getDisplayName);
  const working = crew.filter(c => c.currentSession);
  const idle = crew.filter(c => !c.currentSession);

  return (
    <motion.div
      key="panel-crew"
      initial={fadeInVariants.initial}
      animate={fadeInVariants.animate}
      exit={fadeInVariants.exit}
      transition={fadeInVariants.transition}
      className="flex flex-col flex-1"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-semibold text-white/80">Crew</h3>
          <span className="text-xs text-white/30">{working.length} working · {idle.length} idle</span>
        </div>
      </div>

      <div className="space-y-1.5 overflow-y-auto flex-1">
        {/* Working */}
        {working.map(c => {
          const typeColor = SESSION_TYPE_COLORS[c.currentSession!.type];
          return (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-white/70">{c.name}</span>
                <div className="flex items-center gap-2 text-xs text-white/35 mt-0.5">
                  <span
                    className="px-1.5 py-0.5 rounded-md text-[10px] font-medium"
                    style={{
                      backgroundColor: `${typeColor.rgba}0.1)`,
                      color: `${typeColor.rgba}0.7)`,
                    }}
                  >
                    {typeColor.label}
                  </span>
                  <span className="truncate">{c.currentSession!.strain}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Idle */}
        {idle.length > 0 && working.length > 0 && (
          <div className="pt-2 pb-1">
            <span className="text-[10px] text-white/20 uppercase tracking-wider">Idle</span>
          </div>
        )}
        {idle.map(c => (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.01] p-3"
          >
            <div className="w-1.5 h-1.5 rounded-full border border-white/20 flex-shrink-0" />
            <span className="text-sm text-white/30">{c.name}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

import { useState, useMemo, useRef, useEffect } from 'react';
import { AlertTriangle, Calendar, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { useProductionPlanner } from '../hooks/useProductionPlanner';
import { RoomDetailCard } from './RoomDetailCard';
import { StrainStatsPanel } from './StrainStatsPanel';
import { STAGE_HEX, ROOM_TYPE_ORDER } from '../types';
import type { CalendarRoom, StrainCultivationStats } from '../types';
import {
  ROOM_TYPE_DOT,
  ROOM_TYPE_LEFT_BORDER,
  STAGE_BADGE,
  CHIP_STAGE_COLORS,
} from '@/features/cultivation/constants/stageColors';

const DAY_WIDTH = 8;
const ROW_HEIGHT = 48;
const LABEL_WIDTH = 120;
const HEADER_HEIGHT = 52;
const WEEKS_BEFORE = 4;
const WEEKS_AFTER = 16;

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface WeekMarker {
  x: number;
  date: Date;
  label: string;
  isMonthStart: boolean;
}

export function ProductionPlannerView() {
  const { rooms, strainStatsById, harvestAlerts, loading, error, reload } = useProductionPlanner();
  const [selectedRoom, setSelectedRoom] = useState<CalendarRoom | null>(null);
  const [selectedStrain, setSelectedStrain] = useState<StrainCultivationStats | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date(), []);
  const startDate = useMemo(() => {
    const d = getMonday(today);
    d.setDate(d.getDate() - WEEKS_BEFORE * 7);
    return d;
  }, [today]);
  const totalDays = (WEEKS_BEFORE + WEEKS_AFTER) * 7;
  const totalWidth = totalDays * DAY_WIDTH;

  const todayX = daysBetween(startDate, today) * DAY_WIDTH;

  const weeks = useMemo<WeekMarker[]>(() => {
    const result: WeekMarker[] = [];
    for (let w = 0; w < WEEKS_BEFORE + WEEKS_AFTER; w++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + w * 7);
      result.push({
        x: w * 7 * DAY_WIDTH,
        date: d,
        label: formatShortDate(d),
        isMonthStart: d.getDate() <= 7,
      });
    }
    return result;
  }, [startDate]);

  // Auto-scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) {
      const scrollTo = todayX - scrollRef.current.clientWidth / 3;
      scrollRef.current.scrollLeft = Math.max(0, scrollTo);
    }
  }, [todayX, loading]);

  function handleRoomClick(room: CalendarRoom) {
    setSelectedStrain(null);
    setSelectedRoom(room);
  }

  function handleStrainClick(strainId: string) {
    const stats = strainStatsById.get(strainId);
    if (stats) setSelectedStrain(stats);
  }

  function handleBack() {
    if (selectedStrain) {
      setSelectedStrain(null);
    } else {
      setSelectedRoom(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cult-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-cult-stage-flower mb-4">{error}</p>
        <button onClick={reload} className="px-4 py-2 bg-cult-accent text-cult-bg rounded font-medium">
          Retry
        </button>
      </div>
    );
  }

  const showPanel = selectedRoom !== null;
  const panelContent = selectedStrain ? (
    <StrainStatsPanel strain={selectedStrain} onBack={handleBack} />
  ) : selectedRoom ? (
    <RoomDetailCard room={selectedRoom} onStrainClick={handleStrainClick} onClose={() => setSelectedRoom(null)} />
  ) : null;

  return (
    <div className="flex flex-col h-full font-montserrat">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-cult-border">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-cult-accent" />
          <h1 className="text-xl font-bold text-cult-white">Production Planner</h1>
          <span className="text-sm text-cult-text-muted">
            {rooms.length} rooms &middot; {rooms.reduce((s, r) => s + r.total_plants, 0)} plants
          </span>
        </div>
      </div>

      {/* Harvest Alerts */}
      {harvestAlerts.length > 0 && (
        <div className="flex items-center gap-3 px-6 py-2 bg-cult-stage-harvest/10 border-b border-cult-stage-harvest/30">
          <AlertTriangle className="w-4 h-4 text-cult-stage-harvest flex-shrink-0" />
          <div className="flex gap-4 overflow-x-auto text-sm">
            {harvestAlerts.map((a, i) => (
              <span key={i} className="whitespace-nowrap text-cult-stage-harvest">
                <span className="font-semibold">{a.room_code}</span>
                <span className="text-cult-text-secondary mx-1">{a.strain_name}</span>
                <span className="font-medium">
                  {a.days_until === 0 ? 'today' : `${a.days_until}d`}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main content: calendar + optional panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Calendar */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-auto">
            <div className="relative" style={{ width: LABEL_WIDTH + totalWidth, minHeight: HEADER_HEIGHT + rooms.length * ROW_HEIGHT }}>
              {/* Week headers */}
              <div className="sticky top-0 z-10 flex bg-cult-bg border-b border-cult-border" style={{ height: HEADER_HEIGHT }}>
                <div className="flex-shrink-0 border-r border-cult-border bg-cult-bg" style={{ width: LABEL_WIDTH }} />
                <div className="relative" style={{ width: totalWidth }}>
                  {weeks.map((w, i) => (
                    <div
                      key={i}
                      className={`absolute top-0 bottom-0 border-l ${w.isMonthStart ? 'border-cult-border-strong' : 'border-cult-border/50'}`}
                      style={{ left: w.x }}
                    >
                      <span className={`absolute top-1 left-1 text-xs ${w.isMonthStart ? 'text-cult-white font-semibold' : 'text-cult-text-muted'}`}>
                        {w.label}
                      </span>
                    </div>
                  ))}
                  {/* Today marker header */}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-cult-accent z-20" style={{ left: todayX }} />
                </div>
              </div>

              {/* Room rows */}
              {rooms.map((room, rowIdx) => {
                const y = HEADER_HEIGHT + rowIdx * ROW_HEIGHT;
                const isSelected = selectedRoom?.room_id === room.room_id;

                return (
                  <div
                    key={room.room_id}
                    className={`absolute flex border-b border-cult-border/50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-cult-surface-raised' : 'hover:bg-cult-surface/60'
                    }`}
                    style={{ top: y, height: ROW_HEIGHT, width: LABEL_WIDTH + totalWidth }}
                    onClick={() => handleRoomClick(room)}
                  >
                    {/* Room label */}
                    <div className={`flex-shrink-0 flex items-center gap-2 px-3 border-r border-cult-border/50 border-l-4 ${ROOM_TYPE_LEFT_BORDER[room.room_type] ?? ''}`} style={{ width: LABEL_WIDTH }}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ROOM_TYPE_DOT[room.room_type] ?? 'bg-cult-border'}`} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-cult-white truncate">{room.room_code}</div>
                        <div className="text-[10px] text-cult-text-muted">{room.total_plants}p &middot; {room.strain_count}s</div>
                      </div>
                    </div>

                    {/* Timeline area */}
                    <div className="relative flex-1" style={{ width: totalWidth }}>
                      {/* Strain cycle bars */}
                      {room.strains.map((strain, sIdx) => {
                        if (!strain.earliest_planted_date) return null;
                        const planted = new Date(strain.earliest_planted_date);
                        const barStart = daysBetween(startDate, planted) * DAY_WIDTH;
                        const estEnd = strain.estimated_harvest_date
                          ? new Date(strain.estimated_harvest_date)
                          : new Date(planted.getTime() + 88 * 86400000); // default 88 day cycle
                        const barWidth = Math.max(daysBetween(planted, estEnd) * DAY_WIDTH, 14);
                        const barY = 4 + sIdx * 10;
                        const color = STAGE_HEX[strain.growth_stage] ?? '#6B7280';

                        if (barY + 8 > ROW_HEIGHT) return null; // overflow protection

                        return (
                          <div
                            key={strain.strain_id}
                            className="absolute rounded-sm opacity-80 hover:opacity-100 transition-opacity"
                            style={{
                              left: Math.max(barStart, 0),
                              top: barY,
                              width: barWidth,
                              height: 8,
                              backgroundColor: color,
                            }}
                            title={`${strain.strain_name} — ${strain.plant_count}p ${strain.growth_stage} (${strain.days_in_stage ?? '?'}d)`}
                          />
                        );
                      })}

                      {/* Today line */}
                      <div className="absolute top-0 bottom-0 w-0.5 bg-cult-accent/60 z-10" style={{ left: todayX }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Side panel */}
        {showPanel && (
          <div className="w-[420px] flex-shrink-0 border-l border-cult-border overflow-y-auto bg-cult-bg">
            {panelContent}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductionPlannerView;

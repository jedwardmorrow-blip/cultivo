import { memo } from 'react';
import {
  FACILITY, PHASE_DIVIDER_X, STATE_FILL, KIND_DOT, TIME_ANCHORS,
  type FacilityRoom, type RoomState as RoomStateKind, type TimeAnchor,
} from './data';

interface VLabelProps {
  x: number; y: number; text: string; fill: string;
  opacity?: number; weight?: number; size?: number;
  letterSpacing?: string; mono?: boolean;
}
function VLabel({ x, y, text, fill, opacity = 1, weight = 400, size = 9, letterSpacing = '0.06em', mono = true }: VLabelProps) {
  return (
    <text
      transform={`translate(${x}, ${y}) rotate(-90)`}
      fontFamily={mono ? 'IBM Plex Mono' : 'IBM Plex Sans'}
      fontSize={size}
      letterSpacing={letterSpacing}
      fill={fill}
      opacity={opacity}
      style={{ fontWeight: weight }}
    >
      {text}
    </text>
  );
}

type DerivedRoom = FacilityRoom & {
  state: RoomStateKind;
  day: string;
  label: string;
  kind: FacilityRoom['layoutType'];
  strain: string | null;
  dim?: boolean;
  isPattern?: boolean;
  focused?: boolean;
};

interface FloorPlanSVGProps {
  anchor: TimeAnchor;
  anchorIdx: number;
  onScrub: (idx: number) => void;
}

export const FloorPlanSVG = memo(function FloorPlanSVG({ anchor, anchorIdx, onScrub }: FloorPlanSVGProps) {
  const W = 1300, H = 320;
  const corridorY = 250;
  const corridorH = 22;

  const rooms: DerivedRoom[] = FACILITY.rooms.map((r) => {
    const baseState: RoomStateKind = !r.inCycle
      ? (r.layoutType === 'water' || r.layoutType === 'lab' ? 'nominal' : 'active')
      : (r.urgency_score ?? 0) >= 3 ? 'urgent'
      : (r.urgency_score ?? 0) >= 1 ? 'attention'
      : 'active';

    const dayStr = r.inCycle && typeof r.days_in_stage === 'number'
      ? 'D' + r.days_in_stage
      : '—';

    const strainCaption = r.caption
      ?? (r.inCycle && r.strain_count
            ? r.strain_count + (r.strain_count === 1 ? ' strain' : ' strains')
            : null);

    const derived: DerivedRoom = {
      ...r,
      state: baseState,
      day: dayStr,
      label: r.code,
      kind: r.layoutType,
      strain: strainCaption ?? null,
    };

    const o = anchor.overrides[r.id];
    if (!o) return { ...derived, focused: anchor.isLive ? r.focused : false };
    return {
      ...derived,
      ...(o.state ? { state: o.state } : {}),
      ...(o.day ? { day: o.day } : {}),
      ...(o.flag !== undefined ? { flag: o.flag ?? undefined } : {}),
      ...(o.dim ? { dim: true } : {}),
      ...(o.isPattern ? { isPattern: true } : {}),
      focused: o.focused !== undefined ? o.focused : (anchor.isLive ? r.focused : false),
    };
  });

  const focused = rooms.find((r) => r.focused);
  const pattern = anchor.id === 'cyc-1'
    ? rooms.find((r) => r.code === 'FLW-02')
    : rooms.find((r) => r.code === 'FLW-04');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="fpl-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="fpl-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.5" />
        </pattern>
        <radialGradient id="fpl-glow-bad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(197,106,106,0.45)" />
          <stop offset="100%" stopColor="rgba(197,106,106,0)" />
        </radialGradient>
        <radialGradient id="fpl-glow-warn" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(200,148,58,0.30)" />
          <stop offset="100%" stopColor="rgba(200,148,58,0)" />
        </radialGradient>
        <radialGradient id="fpl-glow-focus" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="rgba(232,224,212,0.18)" />
          <stop offset="100%" stopColor="rgba(232,224,212,0)" />
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill="url(#fpl-grid)" />

      <rect
        x={FACILITY.building.x} y={FACILITY.building.y}
        width={FACILITY.building.w} height={FACILITY.building.h}
        fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="1"
      />

      <line x1={PHASE_DIVIDER_X} y1={20} x2={PHASE_DIVIDER_X} y2={300}
            stroke="rgba(168,184,154,0.35)" strokeWidth="0.8" strokeDasharray="6 4" />
      <text x={PHASE_DIVIDER_X} y={14}
            fontFamily="IBM Plex Mono" fontSize="8.5"
            letterSpacing="0.22em" fill="rgba(168,184,154,0.85)"
            textAnchor="middle" style={{ textTransform: 'uppercase' }}>
        ◀  PHASE I    ·    PHASE II  ▶
      </text>

      {rooms.filter((r) => r.state === 'urgent').map((r) => (
        <ellipse key={`glow-${r.id}`}
          cx={r.x + r.w / 2} cy={r.y + r.h / 2}
          rx={r.w * 1.0} ry={r.h * 0.7}
          fill="url(#fpl-glow-bad)"
          style={{ animation: 'fpl-pulse-bad 2s ease-in-out infinite' }} />
      ))}
      {rooms.filter((r) => r.state === 'attention').map((r) => (
        <ellipse key={`glow-${r.id}`}
          cx={r.x + r.w / 2} cy={r.y + r.h / 2}
          rx={r.w * 0.9} ry={r.h * 0.6}
          fill="url(#fpl-glow-warn)"
          style={{ animation: 'fpl-pulse-warn 3s ease-in-out infinite' }} />
      ))}

      {focused && pattern && focused.id !== pattern.id ? (
        <g opacity="0.85">
          <path
            d={`M ${focused.x + focused.w / 2} ${focused.y - 4}
                Q ${(focused.x + pattern.x + focused.w + pattern.w) / 4} ${focused.y - 18}
                  ${pattern.x + pattern.w / 2} ${pattern.y - 4}`}
            stroke="rgba(232,224,212,0.55)" strokeWidth="1"
            strokeDasharray="3 3" fill="none" />
          <circle cx={focused.x + focused.w / 2} cy={focused.y - 4} r="2.5" fill="rgba(232,224,212,0.85)" />
          <circle cx={pattern.x + pattern.w / 2} cy={pattern.y - 4} r="2.5" fill="rgba(232,224,212,0.85)" />
          <text x={(focused.x + focused.w / 2 + pattern.x + pattern.w / 2) / 2}
                y={focused.y - 22}
                fontFamily="IBM Plex Mono" fontSize="7.5"
                letterSpacing="0.20em" fill="rgba(232,224,212,0.75)"
                textAnchor="middle" style={{ textTransform: 'uppercase' }}>
            ◇ THE SEED · same curve
          </text>
        </g>
      ) : null}

      {rooms.map((r) => {
        const s = STATE_FILL[r.state];
        const dimOpacity = r.dim ? 0.32 : 1;
        const isFocus = !!r.focused;
        const narrow = r.w < 70;
        const tall = r.h > 100;

        return (
          <g key={r.id} opacity={dimOpacity}>
            {isFocus ? (
              <ellipse cx={r.x + r.w / 2} cy={r.y + r.h / 2}
                rx={r.w * 0.85} ry={r.h * 0.65}
                fill="url(#fpl-glow-focus)" />
            ) : null}
            <rect x={r.x} y={r.y} width={r.w} height={r.h}
                  fill={s.fill} stroke={s.stroke} strokeWidth={isFocus ? 1.6 : 0.8} />

            {r.code ? (
              <circle cx={r.x + 6} cy={r.y + 6} r="2.5" fill={KIND_DOT[r.kind]} />
            ) : null}

            {r.code && narrow && tall ? (
              <>
                <VLabel x={r.x + r.w / 2 + 4} y={r.y + r.h - 8}
                        text={r.label} fill={s.text} weight={500}
                        letterSpacing="0.10em" size={9.5} />
                {r.day && r.day !== '—' ? (
                  <VLabel x={r.x + r.w / 2 - 8} y={r.y + r.h - 8}
                          text={r.day} fill={s.text} weight={400}
                          letterSpacing="0.06em" size={9} />
                ) : null}
                {r.strain ? (
                  <VLabel x={r.x + r.w / 2 - 20} y={r.y + r.h - 8}
                          text={r.strain.length > 22 ? r.strain.slice(0, 20) + '…' : r.strain}
                          fill={s.text} opacity={0.65}
                          letterSpacing="0" size={8.5} mono={false} />
                ) : null}
                {r.flag ? (
                  <VLabel x={r.x + r.w - 6} y={r.y + r.h - 8}
                          text={r.flag} fill={s.text} weight={500}
                          letterSpacing="0.14em" size={7.5} />
                ) : null}
              </>
            ) : r.code && narrow && !tall ? (
              <>
                <text x={r.x + r.w / 2} y={r.y + r.h / 2 - 4}
                      fontFamily="IBM Plex Mono" fontSize="9"
                      letterSpacing="0.10em" fill={s.text}
                      textAnchor="middle" style={{ fontWeight: 500 }}>
                  {r.label}
                </text>
                {r.day && r.day !== '—' ? (
                  <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 8}
                        fontFamily="IBM Plex Mono" fontSize="8.5"
                        letterSpacing="0.04em" fill={s.text}
                        textAnchor="middle" opacity="0.75">
                    {r.day}
                  </text>
                ) : null}
              </>
            ) : r.code ? (
              <>
                <text x={r.x + 13} y={r.y + 11}
                      fontFamily="IBM Plex Mono" fontSize="9.5"
                      letterSpacing="0.08em" fill={s.text}
                      style={{ fontWeight: 500 }}>
                  {r.label}
                </text>
                {r.day && r.day !== '—' ? (
                  <text x={r.x + r.w - 6} y={r.y + 11}
                        fontFamily="IBM Plex Mono" fontSize="9"
                        letterSpacing="0.04em" fill={s.text}
                        textAnchor="end" style={{ fontWeight: 500 }}>
                    {r.day}
                  </text>
                ) : null}
                {r.strain && r.w > 70 ? (
                  r.h > r.w
                    ? <VLabel x={r.x + r.w / 2 + 5} y={r.y + r.h - 8}
                              text={r.strain.length > 26 ? r.strain.slice(0, 24) + '…' : r.strain}
                              fill={s.text} opacity={0.62}
                              letterSpacing="0" size={9} mono={false} />
                    : <text x={r.x + 6} y={r.y + 26}
                            fontFamily="IBM Plex Sans" fontSize="9.5"
                            fill={s.text} opacity="0.70"
                            style={{ fontStyle: 'italic' }}>
                        {r.strain.length > 38 ? r.strain.slice(0, 36) + '…' : r.strain}
                      </text>
                ) : null}
                {r.flag ? (
                  r.h > r.w
                    ? <VLabel x={r.x + r.w - 6} y={r.y + r.h - 8}
                              text={r.flag} fill={s.text} weight={500}
                              letterSpacing="0.14em" size={7.5} />
                    : <text x={r.x + 6} y={r.y + r.h - 8}
                            fontFamily="IBM Plex Mono" fontSize="8"
                            letterSpacing="0.14em" fill={s.text}
                            style={{ textTransform: 'uppercase', fontWeight: 500 }}>
                        {r.flag}
                      </text>
                ) : null}
              </>
            ) : (
              <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 3}
                    fontFamily="IBM Plex Mono" fontSize="9"
                    letterSpacing="0.18em" fill={s.text}
                    textAnchor="middle"
                    style={{ textTransform: 'uppercase' }}>
                {r.label}
              </text>
            )}

            {r.inCycle && (r.tasks_today ?? 0) > 0 ? (() => {
              const pct = Math.min(1, (r.tasks_completed_today ?? 0) / (r.tasks_today ?? 1));
              const inset = 4;
              const barY = r.y + r.h - 2.5;
              const barW = r.w - inset * 2;
              return (
                <g>
                  <line x1={r.x + inset} y1={barY} x2={r.x + r.w - inset} y2={barY}
                        stroke="rgba(245,244,241,0.10)" strokeWidth="1" />
                  <line x1={r.x + inset} y1={barY} x2={r.x + inset + barW * pct} y2={barY}
                        stroke="rgba(232,224,212,0.55)" strokeWidth="1" />
                </g>
              );
            })() : null}
          </g>
        );
      })}

      {/* Corridor — time scrubber */}
      <rect x={FACILITY.building.x} y={corridorY}
            width={FACILITY.building.w} height={corridorH}
            fill="rgba(245,244,241,0.022)"
            stroke="rgba(255,255,255,0.10)" strokeWidth="0.5" />
      <line x1={FACILITY.building.x + 12} y1={corridorY + corridorH / 2}
            x2={FACILITY.building.x + FACILITY.building.w - 12} y2={corridorY + corridorH / 2}
            stroke="rgba(245,244,241,0.14)" strokeWidth="0.6" strokeDasharray="2 4" />
      <text x={FACILITY.building.x + 18} y={corridorY + corridorH + 14}
            fontFamily="IBM Plex Mono" fontSize="7"
            letterSpacing="0.30em" fill="rgba(245,244,241,0.30)"
            style={{ textTransform: 'uppercase' }}>
        ◀  earlier · drag to scrub time
      </text>
      <text x={FACILITY.building.x + FACILITY.building.w - 18} y={corridorY + corridorH + 14}
            fontFamily="IBM Plex Mono" fontSize="7"
            letterSpacing="0.30em" fill="rgba(245,244,241,0.30)"
            textAnchor="end" style={{ textTransform: 'uppercase' }}>
        now  ▶
      </text>

      {TIME_ANCHORS.map((a, i) => {
        const isActive = i === anchorIdx;
        return (
          <g key={a.id} style={{ cursor: 'pointer' }} onClick={() => onScrub(i)}>
            <rect x={a.x - 22} y={corridorY - 4}
                  width="44" height={corridorH + 22}
                  fill="transparent" />
            <line x1={a.x} y1={corridorY + 2} x2={a.x} y2={corridorY + corridorH - 2}
                  stroke={isActive ? 'var(--accent)' : 'rgba(245,244,241,0.30)'}
                  strokeWidth={isActive ? 1.4 : 0.8} />
            <text x={a.x} y={corridorY - 4}
                  fontFamily="IBM Plex Mono" fontSize="7.5"
                  letterSpacing="0.16em"
                  fill={isActive ? 'var(--accent)' : 'rgba(245,244,241,0.42)'}
                  textAnchor="middle"
                  style={{ textTransform: 'uppercase', fontWeight: isActive ? 600 : 400 }}>
              {a.label}
            </text>
          </g>
        );
      })}

      {(() => {
        const a = TIME_ANCHORS[anchorIdx];
        return (
          <g style={{ pointerEvents: 'none' }}>
            <line x1={a.x} y1={20} x2={a.x} y2={corridorY}
                  stroke="rgba(168,184,154,0.22)" strokeWidth="0.6"
                  strokeDasharray="2 4" />
            <rect x={a.x - 7} y={corridorY - 1}
                  width="14" height={corridorH + 2}
                  fill="rgba(168,184,154,0.18)"
                  stroke="var(--accent)" strokeWidth="1" />
            <line x1={a.x} y1={corridorY + 3} x2={a.x} y2={corridorY + corridorH - 3}
                  stroke="var(--accent)" strokeWidth="0.6" />
            {a.isLive ? (
              <circle cx={a.x} cy={corridorY + corridorH / 2} r="2.5"
                      fill="var(--status-ok)"
                      style={{ animation: 'fpl-blink 2s ease-in-out infinite' }} />
            ) : null}
          </g>
        );
      })()}

      <g transform="translate(1280, 6)">
        <path d="M0 12 L0 0 M0 0 L-3 4 M0 0 L3 4"
              stroke="rgba(245,244,241,0.40)" strokeWidth="0.8" fill="none" />
        <text x={6} y={6} fontFamily="IBM Plex Mono" fontSize="7"
              letterSpacing="0.10em" fill="rgba(245,244,241,0.40)">N</text>
      </g>
    </svg>
  );
});

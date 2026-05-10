import { useEffect, useRef, useState } from 'react';
import './praxis-atom.css';

export type PraxisAtomState =
  | 'idle'
  | 'boot'
  | 'loading'
  | 'success'
  | 'error'
  | 'reduced-motion';

interface PraxisAtomProps {
  state?: PraxisAtomState;
  size?: number;
  /** When provided, BOOT auto-transitions to IDLE after this many ms.
   *  Set to 0 to hold BOOT indefinitely. */
  bootDuration?: number;
  /** Called when the boot sequence completes. */
  onBootComplete?: () => void;
  /** Optional aria-label override. Default: 'Praxis · operating atom'. */
  ariaLabel?: string;
  /** Force simplified or full geometry. Default auto: simplified below
   *  SIMPLIFIED_THRESHOLD_PX, full at or above. */
  variant?: 'auto' | 'full' | 'simplified';
}

const COG_TEETH = Array.from({ length: 12 }).map((_, i) => i * 30);

/** Below this px size, the cog teeth and orbits blur into noise.
 *  The simplified variant (gold ring + red center + pulse) reads
 *  cleanly down to 16px. Matches favicon-simplified.svg geometry. */
const SIMPLIFIED_THRESHOLD_PX = 32;

export function PraxisAtom({
  state = 'idle',
  size = 56,
  bootDuration = 1400,
  onBootComplete,
  ariaLabel = 'Praxis · operating atom',
  variant = 'auto',
}: PraxisAtomProps) {
  // BOOT auto-transitions to IDLE unless the parent explicitly holds it.
  const [internalState, setInternalState] = useState<PraxisAtomState>(state);
  const completedRef = useRef(false);

  useEffect(() => {
    setInternalState(state);
    completedRef.current = false;
  }, [state]);

  useEffect(() => {
    if (internalState !== 'boot' || bootDuration === 0) return;
    const t = window.setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      setInternalState('idle');
      onBootComplete?.();
    }, bootDuration);
    return () => window.clearTimeout(t);
  }, [internalState, bootDuration, onBootComplete]);

  const useSimplified =
    variant === 'simplified' ||
    (variant === 'auto' && size < SIMPLIFIED_THRESHOLD_PX);

  if (useSimplified) {
    return (
      <SimplifiedAtom
        size={size}
        state={internalState}
        ariaLabel={ariaLabel}
      />
    );
  }

  return (
    <div
      className="praxis-atom"
      data-state={internalState}
      role="img"
      aria-label={ariaLabel}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 360 360" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="pa-inner-field">
            <circle cx="180" cy="180" r="156" />
          </clipPath>
          <radialGradient id="pa-nucleus-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E84450" />
            <stop offset="60%" stopColor="#C42130" />
            <stop offset="100%" stopColor="#7a1422" />
          </radialGradient>
        </defs>

        {/* Outer cog frame — gold body and 12 teeth */}
        <circle cx="180" cy="180" r="172" fill="#C9A24B" />
        <g fill="#C9A24B">
          {COG_TEETH.map((angle) => (
            <rect
              key={angle}
              x="174"
              y="0"
              width="12"
              height="14"
              transform={`rotate(${angle} 180 180)`}
            />
          ))}
        </g>

        {/* Inner navy field with paper-cream stroke */}
        <circle
          cx="180"
          cy="180"
          r="158"
          fill="#0a2545"
          stroke="#F1E8D2"
          strokeWidth="3"
        />

        {/* Animated content clipped to inner navy field */}
        <g clipPath="url(#pa-inner-field)">
          {/* Orbit 03 — outermost, slowest */}
          <g className="pa-orbit pa-orbit-3">
            <ellipse
              cx="180"
              cy="180"
              rx="128"
              ry="46"
              fill="none"
              stroke="#C9A24B"
              strokeWidth="0.8"
              strokeDasharray="2,3"
              opacity="0.42"
            />
            <circle
              cx="308"
              cy="180"
              r="5"
              className="pa-orbit-particle"
              fill="#C9A24B"
              opacity="0.85"
              style={{ ['--pa-particle-fill' as string]: '#C9A24B' }}
            />
            <circle
              cx="52"
              cy="180"
              r="4"
              className="pa-orbit-particle"
              fill="#C9A24B"
              opacity="0.6"
              style={{ ['--pa-particle-fill' as string]: '#C9A24B' }}
            />
            <circle
              cx="180"
              cy="226"
              r="3.5"
              className="pa-orbit-particle"
              fill="#C9A24B"
              opacity="0.7"
              style={{ ['--pa-particle-fill' as string]: '#C9A24B' }}
            />
          </g>

          {/* Orbit 02 — middle, reverse */}
          <g className="pa-orbit pa-orbit-2">
            <ellipse
              cx="180"
              cy="180"
              rx="92"
              ry="92"
              fill="none"
              stroke="#C9A24B"
              strokeWidth="0.9"
              strokeDasharray="3,3"
              opacity="0.55"
            />
            <circle
              cx="272"
              cy="180"
              r="7"
              className="pa-orbit-particle"
              fill="#F1E8D2"
              style={{ ['--pa-particle-fill' as string]: '#F1E8D2' }}
            />
            <circle
              cx="88"
              cy="180"
              r="5"
              className="pa-orbit-particle"
              fill="#C9A24B"
              style={{ ['--pa-particle-fill' as string]: '#C9A24B' }}
            />
          </g>

          {/* Orbit 01 — innermost, fastest */}
          <g className="pa-orbit pa-orbit-1">
            <ellipse
              cx="180"
              cy="180"
              rx="62"
              ry="22"
              fill="none"
              stroke="#C9A24B"
              strokeWidth="0.7"
              strokeDasharray="1.5,2"
              opacity="0.55"
            />
            <circle
              cx="242"
              cy="180"
              r="5"
              className="pa-orbit-particle"
              fill="#F1E8D2"
              style={{ ['--pa-particle-fill' as string]: '#F1E8D2' }}
            />
          </g>

          {/* Outer pulse halo */}
          <circle
            className="pa-halo"
            cx="180"
            cy="180"
            r="56"
            fill="#C42130"
            opacity="0.18"
          />

          {/* Pulsing nucleus */}
          <circle
            className="pa-nucleus"
            cx="180"
            cy="180"
            r="44"
            fill="url(#pa-nucleus-grad)"
          >
            {/* fallback fill class for ERROR state to override gradient */}
          </circle>
          <circle
            className="pa-nucleus-fill"
            cx="180"
            cy="180"
            r="0"
            fill="transparent"
          />

          {/* Specular highlight on nucleus */}
          <circle
            className="pa-specular"
            cx="170"
            cy="170"
            r="10"
            fill="#F1E8D2"
            opacity="0.35"
          />

          {/* SUCCESS flash — overlaid paper-cream burst, transparent at rest */}
          <circle
            className="pa-success-flash"
            cx="180"
            cy="180"
            r="44"
            fill="#F1E8D2"
            opacity="0"
          />
        </g>
      </svg>
    </div>
  );
}

/** Simplified atom for sub-32px contexts. Geometry matches favicon-simplified.svg:
 *  navy disc, gold ring, red center, halo pulse for liveness. No teeth, no
 *  orbits, no nucleus gradient — they all blur into noise at small scale. */
function SimplifiedAtom({
  size,
  state,
  ariaLabel,
}: {
  size: number;
  state: PraxisAtomState;
  ariaLabel: string;
}) {
  return (
    <div
      className="praxis-atom praxis-atom-simplified"
      data-state={state}
      role="img"
      aria-label={ariaLabel}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 360 360" xmlns="http://www.w3.org/2000/svg">
        {/* Navy disc */}
        <circle cx="180" cy="180" r="172" fill="#0a2545" />
        {/* Gold ring */}
        <circle
          cx="180"
          cy="180"
          r="172"
          fill="none"
          stroke="#C9A24B"
          strokeWidth="14"
        />
        {/* Pulse halo around center */}
        <circle
          className="pa-halo"
          cx="180"
          cy="180"
          r="84"
          fill="#C42130"
          opacity="0.18"
        />
        {/* Red center */}
        <circle
          className="pa-nucleus"
          cx="180"
          cy="180"
          r="68"
          fill="#C42130"
        />
        {/* SUCCESS flash overlay */}
        <circle
          className="pa-success-flash"
          cx="180"
          cy="180"
          r="68"
          fill="#F1E8D2"
          opacity="0"
        />
        {/* ERROR fill override hook */}
        <circle
          className="pa-nucleus-fill"
          cx="180"
          cy="180"
          r="0"
          fill="transparent"
        />
      </svg>
    </div>
  );
}

interface SeedGlyphProps { size?: number; color?: string; }

export function SeedGlyph({ size = 14, color = 'currentColor' }: SeedGlyphProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.4" aria-hidden>
      <ellipse cx="12" cy="12" rx="5.5" ry="9" transform="rotate(-30 12 12)" />
      <path d="M12 21 V18" />
      <circle cx="12" cy="12" r="1" fill={color} stroke="none" />
    </svg>
  );
}

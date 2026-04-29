import type { ReactNode } from 'react';

export interface SectionProps {
  label: string;
  cellCount: number;
  children: ReactNode;
}

export function Section({ label, cellCount, children }: SectionProps) {
  return (
    <div className="home-section">
      <div className="home-section-label">{label}</div>
      <div
        className="home-section-cells"
        style={{ ['--cells' as never]: cellCount } as React.CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}

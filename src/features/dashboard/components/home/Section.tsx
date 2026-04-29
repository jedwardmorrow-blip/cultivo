import type { CSSProperties, ReactNode } from 'react';
import type { CellMarker } from './Cell';

export interface SectionProps {
  label: string;
  cellCount?: number;
  severity?: CellMarker;
  className?: string;
  children: ReactNode;
}

export function Section({ label, cellCount, severity, className, children }: SectionProps) {
  return (
    <section className={`home-section${className ? ' ' + className : ''}`}>
      <header className="home-section-header">
        {severity && <span className={`home-section-marker ${severity}`} />}
        <span className="home-section-label">{label}</span>
      </header>
      {cellCount ? (
        <div
          className="home-section-cells"
          style={{ ['--cells' as never]: cellCount } as CSSProperties}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

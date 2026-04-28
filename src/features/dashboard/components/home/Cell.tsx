import { useNavigate } from 'react-router-dom';

export type CellMarker = 'ok' | 'warn' | 'bad' | null;

export interface CellProps {
  label: string;
  primary: string;
  secondary?: string;
  drillRoute?: string;
  marker?: CellMarker;
  onClick?: () => void;
}

export function Cell({ label, primary, secondary, drillRoute, marker, onClick }: CellProps) {
  const navigate = useNavigate();
  const handle = () => {
    if (onClick) onClick();
    else if (drillRoute) navigate(drillRoute);
  };
  return (
    <button className="home-cell" onClick={handle} type="button">
      <span className="home-cell-label">
        {marker && <span className={`home-cell-marker ${marker}`} />}
        {label}
      </span>
      <span className="home-cell-primary">{primary}</span>
      {secondary && <span className="home-cell-secondary">{secondary}</span>}
    </button>
  );
}

import { useEffect } from 'react';

export interface PendingMeta {
  cellId: string;
  cellLabel: string;
  shortReason: string;
  whatItShows: string;
  whatsMissing: string;
  buildPath: string;
  sprintRef?: string;
}

interface Props {
  meta: PendingMeta;
  onClose: () => void;
}

export function PendingModal({ meta, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="home-modal-overlay" onClick={onClose}>
      <div className="home-modal" onClick={(e) => e.stopPropagation()}>
        <div className="home-modal-eyebrow">Pending cell · {meta.cellId}</div>
        <div className="home-modal-title">{meta.cellLabel}</div>
        <div className="home-modal-row">
          <span className="home-modal-key">Will show</span>
          <span className="home-modal-val">{meta.whatItShows}</span>
        </div>
        <div className="home-modal-row">
          <span className="home-modal-key">Missing</span>
          <span className="home-modal-val">{meta.whatsMissing}</span>
        </div>
        <div className="home-modal-row">
          <span className="home-modal-key">Build path</span>
          <span className="home-modal-val">{meta.buildPath}</span>
        </div>
        {meta.sprintRef && (
          <div className="home-modal-row">
            <span className="home-modal-key">Sprint ref</span>
            <span className="home-modal-val">{meta.sprintRef}</span>
          </div>
        )}
        <div className="home-modal-actions">
          <button className="home-modal-close" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

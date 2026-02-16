import { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { CoversheetPublic } from '../../../../pages/public/CoversheetPublic';
import { getCoversheetPath } from '../../services/coversheet.service';

interface CoversheetSidePanelProps {
  accessToken: string;
  onClose: () => void;
}

export function CoversheetSidePanel({ accessToken, onClose }: CoversheetSidePanelProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const newTabPath = getCoversheetPath(accessToken);

  return (
    <div
      className={`fixed inset-0 z-[60] transition-colors duration-200 ${
        isVisible ? 'bg-black/50' : 'bg-transparent'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`absolute inset-y-0 right-0 w-full max-w-[70vw] bg-white shadow-2xl transition-transform duration-200 ease-out ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="sticky top-0 z-10 bg-gray-900 text-white px-6 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="font-semibold uppercase tracking-wider text-sm">
              Coversheet Preview
            </span>
          </div>
          <a
            href={newTabPath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open in New Tab
          </a>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-52px)]">
          <CoversheetPublic token={accessToken} onClose={handleClose} />
        </div>
      </div>
    </div>
  );
}

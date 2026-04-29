import { FileText, CheckCircle, AlertCircle, Loader, X } from 'lucide-react';
import type { COAUploadQueueItem } from '../services/coa.service';

interface COAUploadQueueProps {
  queue: COAUploadQueueItem[];
  onRemove: (id: string) => void;
  currentIndex: number;
}

export function COAUploadQueue({ queue, onRemove, currentIndex }: COAUploadQueueProps) {
  if (queue.length === 0) return null;

  const getStatusIcon = (status: COAUploadQueueItem['status']) => {
    switch (status) {
      case 'pending':
        return <FileText className="w-4 h-4 text-cult-text-muted" />;
      case 'parsing':
        return <Loader className="w-4 h-4 text-cult-text-primary animate-spin" />;
      case 'parsed':
        return <CheckCircle className="w-4 h-4 text-cult-info" />;
      case 'reviewed':
        return <CheckCircle className="w-4 h-4 text-cult-success" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-cult-danger" />;
      default:
        return <FileText className="w-4 h-4 text-cult-text-muted" />;
    }
  };

  const getStatusLabel = (status: COAUploadQueueItem['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'parsing':
        return 'Parsing...';
      case 'parsed':
        return 'Ready';
      case 'reviewed':
        return 'Reviewed';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="bg-cult-surface border border-cult-border p-4">
      <h3 className="text-sm font-medium text-cult-text-primary uppercase tracking-wider mb-3">
        Upload Queue ({queue.length} COA{queue.length !== 1 ? 's' : ''})
      </h3>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {queue.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-center justify-between p-3 border transition-all ${
              index === currentIndex
                ? 'border-cult-accent bg-cult-black'
                : item.status === 'reviewed'
                ? 'border-cult-success/50 bg-cult-success-muted'
                : item.status === 'error'
                ? 'border-cult-danger/50 bg-cult-danger-muted'
                : 'border-cult-border bg-cult-black/50'
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {getStatusIcon(item.status)}

              <div className="flex-1 min-w-0">
                <p className="text-sm text-cult-text-primary truncate font-medium">
                  {item.fileName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-cult-text-muted">
                    {getStatusLabel(item.status)}
                  </span>
                  {item.parsedData && (
                    <span className="text-xs text-cult-text-muted">
                      • {item.parsedData.strain_name}
                    </span>
                  )}
                  {index === currentIndex && (
                    <span className="text-xs text-cult-text-primary font-medium">
                      • Current
                    </span>
                  )}
                </div>
                {item.error && (
                  <p className="text-xs text-cult-danger mt-1">{item.error}</p>
                )}
              </div>
            </div>

            {item.status !== 'parsing' && index !== currentIndex && (
              <button
                onClick={() => onRemove(item.id)}
                className="p-1 hover:bg-cult-border transition-colors ml-2"
                title="Remove from queue"
              >
                <X className="w-4 h-4 text-cult-text-muted hover:text-cult-text-primary" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

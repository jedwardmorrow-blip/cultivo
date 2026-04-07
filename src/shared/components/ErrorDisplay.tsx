import { AlertCircle } from 'lucide-react';

interface ErrorDisplayProps {
  message: string;
  title?: string;
}

export function ErrorDisplay({ message, title = 'Error' }: ErrorDisplayProps) {
  return (
    <div className="bg-cult-danger-muted border border-cult-danger/40 p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-cult-danger flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="text-cult-danger font-bold uppercase tracking-wider mb-1">{title}</h3>
        <p className="text-cult-text-secondary text-sm">{message}</p>
      </div>
    </div>
  );
}

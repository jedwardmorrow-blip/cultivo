import { AlertCircle } from 'lucide-react';

interface ErrorDisplayProps {
  message: string;
  title?: string;
}

export function ErrorDisplay({ message, title = 'Error' }: ErrorDisplayProps) {
  return (
    <div className="bg-red-900/20 border border-red-700 p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="text-red-400 font-bold uppercase tracking-wider mb-1">{title}</h3>
        <p className="text-red-200 text-sm">{message}</p>
      </div>
    </div>
  );
}

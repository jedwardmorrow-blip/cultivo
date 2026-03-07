import { FileText } from 'lucide-react';

export function DailyDigestView() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <FileText className="w-10 h-10 text-cult-medium-gray" />
      <p className="text-cult-medium-gray text-sm">
        Coming soon &mdash; built in Prompt 5
      </p>
    </div>
  );
}

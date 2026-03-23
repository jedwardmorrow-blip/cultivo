import { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { useWorkerAuth } from '../hooks/useWorkerAuth';
import { OfflineBanner } from './OfflineBanner';

interface WorkerLayoutProps {
  children: ReactNode;
}

export function WorkerLayout({ children }: WorkerLayoutProps) {
  const { staff, logout } = useWorkerAuth();

  if (!staff) return null;

  const displayName = staff.last_name
    ? `${staff.first_name} ${staff.last_name.charAt(0)}.`
    : staff.first_name;

  return (
    <div className="min-h-screen bg-cult-black flex flex-col">
      {/* Header */}
      <header className="bg-cult-near-black border-b border-cult-dark-gray px-4 py-3 flex items-center justify-between flex-shrink-0 safe-top">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cult-medium-gray rounded-full flex items-center justify-center text-cult-white text-sm font-bold uppercase">
            {staff.first_name.charAt(0)}
          </div>
          <div>
            <div className="text-cult-white text-sm font-semibold">{displayName}</div>
            <div className="text-cult-medium-gray text-xs uppercase tracking-wider">
              {staff.role === 'cultivation_manager' ? 'Manager' : staff.role === 'cultivation_lead' ? 'Lead' : 'Cultivator'}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-2.5 text-cult-medium-gray hover:text-cult-white active:bg-cult-charcoal/50 transition-colors text-xs uppercase tracking-wider rounded-lg min-h-[44px]"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
          Out
        </button>
      </header>

      {/* Offline status banner */}
      <OfflineBanner />

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

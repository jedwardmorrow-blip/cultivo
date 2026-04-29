import { ShoppingCart, MessageSquare, Calendar, Users, Activity, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardQuickActionsProps {
  onCreateOrder: () => void;
}

export function DashboardQuickActions({ onCreateOrder }: DashboardQuickActionsProps) {
  const navigate = useNavigate();
  const actions = [
    { label: 'New Order', description: 'Create order for a customer', icon: ShoppingCart, onClick: onCreateOrder },
    { label: 'Log Activity', description: 'Record a call, visit, or note', icon: MessageSquare, onClick: () => navigate('/crm-queue') },
    { label: 'Schedule Visit', description: 'Plan an upcoming site visit', icon: Calendar, onClick: () => navigate('/crm-visit-calendar') },
    { label: 'Prospect Pipeline', description: 'Track prospects through stages', icon: Users, onClick: () => navigate('/crm-prospect-pipeline') },
    { label: 'Account Health', description: 'Monitor at-risk accounts', icon: Activity, onClick: () => navigate('/crm-accounts-hub') },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            onClick={action.onClick}
            className="flex items-center gap-3 px-4 py-3 rounded border border-cult-border-subtle bg-cult-surface text-left transition-colors hover:border-cult-border-strong hover:bg-cult-surface-raised group"
          >
            <Icon className="w-4 h-4 text-cult-text-muted flex-shrink-0" />
            <div className="text-left flex-1 min-w-0">
              <p className="font-mono uppercase tracking-[0.14em] text-[11px] text-cult-text-primary">{action.label}</p>
              <p className="text-xs text-cult-text-muted hidden sm:block">{action.description}</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-cult-text-faint group-hover:text-cult-text-muted transition-colors flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

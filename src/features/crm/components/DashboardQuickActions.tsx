import { ShoppingCart, MessageSquare, Calendar, Users, Activity, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardQuickActionsProps {
  onCreateOrder: () => void;
}

export function DashboardQuickActions({ onCreateOrder }: DashboardQuickActionsProps) {
  const navigate = useNavigate();
  const actions = [
    {
      label: 'New Order',
      description: 'Create order for a customer',
      icon: ShoppingCart,
      color: 'bg-cult-success-muted text-cult-success border-cult-success/30 hover:bg-cult-success/25',
      onClick: onCreateOrder,
    },
    {
      label: 'Log Activity',
      description: 'Record a call, visit, or note',
      icon: MessageSquare,
      color: 'bg-cult-info-muted text-cult-info border-cult-info/30 hover:bg-cult-info/25',
      onClick: () => navigate('/crm-queue'),
    },
    {
      label: 'Schedule Visit',
      description: 'Plan an upcoming site visit',
      icon: Calendar,
      color: 'bg-cult-success-muted text-cult-success border-cult-success/30 hover:bg-cult-success/25',
      onClick: () => navigate('/crm-visit-calendar'),
    },
    {
      label: 'Prospect Pipeline',
      description: 'Track prospects through stages',
      icon: Users,
      color: 'bg-cult-info-muted text-cult-info border-cult-info/30 hover:bg-cult-info/25',
      onClick: () => navigate('/crm-prospect-pipeline'),
    },
    {
      label: 'Account Health',
      description: 'Monitor at-risk accounts',
      icon: Activity,
      color: 'bg-cult-warning-muted text-cult-warning border-cult-warning/30 hover:bg-cult-warning/25',
      onClick: () => navigate('/crm-accounts-hub'),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all group ${action.color}`}
          >
            <div className="p-2 rounded-lg bg-cult-near-black/50 flex-shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-sm font-semibold text-cult-white">{action.label}</p>
              <p className="text-xs text-cult-silver hidden sm:block">{action.description}</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-cult-medium-gray group-hover:text-cult-silver transition-colors flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

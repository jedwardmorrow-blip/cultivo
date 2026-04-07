import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Phone,
  Calendar,
  Gift,
  Handshake,
  Trophy,
  XCircle,
  ChevronRight,
  RefreshCw,
  Mail,
  MapPin,
  Clock,
  ClipboardList,
} from 'lucide-react';
import { LoadingSpinner } from '@/shared/components';
import { getProspectPipeline, updatePipelineStage } from '../services/crm.service';
import type { ProspectPipelineItem, PipelineStage } from '../types';

interface ProspectPipelineProps {}

const STAGES: { key: PipelineStage; label: string; icon: typeof Users; color: string; bgColor: string }[] = [
  { key: 'lead', label: 'Lead', icon: Users, color: 'text-slate-400', bgColor: 'bg-slate-500/15 border-slate-500/30' },
  { key: 'contacted', label: 'Contacted', icon: Phone, color: 'text-sky-400', bgColor: 'bg-sky-500/15 border-sky-500/30' },
  { key: 'meeting_set', label: 'Meeting Set', icon: Calendar, color: 'text-violet-400', bgColor: 'bg-violet-500/15 border-violet-500/30' },
  { key: 'sample_sent', label: 'Sample Sent', icon: Gift, color: 'text-cult-warning', bgColor: 'bg-cult-warning-muted border-cult-warning/30' },
  { key: 'negotiating', label: 'Negotiating', icon: Handshake, color: 'text-orange-400', bgColor: 'bg-orange-500/15 border-orange-500/30' },
  { key: 'closed_won', label: 'Closed Won', icon: Trophy, color: 'text-cult-success', bgColor: 'bg-cult-success-muted border-cult-success/30' },
  { key: 'closed_lost', label: 'Closed Lost', icon: XCircle, color: 'text-cult-danger', bgColor: 'bg-cult-danger-muted border-cult-danger/30' },
];

function stageMeta(stage: PipelineStage) {
  return STAGES.find((s) => s.key === stage) || STAGES[0];
}

export function ProspectPipeline({}: ProspectPipelineProps) {
  const navigate = useNavigate();
  const [prospects, setProspects] = useState<ProspectPipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await getProspectPipeline();
    if (data) setProspects(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStageChange = async (prospectId: string, newStage: PipelineStage) => {
    setMovingId(prospectId);
    await updatePipelineStage(prospectId, newStage);
    await load();
    setMovingId(null);
  };

  const navigateToAccount = (id: string) => {
    navigate(`/crm-account-detail/${id}`);
  };

  if (loading) return <LoadingSpinner />;

  const grouped = STAGES.reduce<Record<PipelineStage, ProspectPipelineItem[]>>((acc, s) => {
    acc[s.key] = prospects.filter((p) => p.pipeline_stage === s.key);
    return acc;
  }, {} as Record<PipelineStage, ProspectPipelineItem[]>);

  const activeStages = STAGES.filter((s) => s.key !== 'closed_won' && s.key !== 'closed_lost');
  const closedWon = grouped['closed_won'] || [];
  const closedLost = grouped['closed_lost'] || [];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cult-white">Prospect Pipeline</h1>
          <p className="text-cult-light-gray mt-2">
            {prospects.length} prospects across {STAGES.filter((s) => grouped[s.key].length > 0).length} stages
          </p>
        </div>
        <button
          onClick={load}
          className="p-2 text-cult-silver hover:text-cult-white bg-cult-dark-gray border border-cult-medium-gray rounded-lg hover:bg-cult-charcoal transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Kanban columns for active stages */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {activeStages.map((stage) => {
          const items = grouped[stage.key] || [];
          const Icon = stage.icon;
          return (
            <div key={stage.key} className="flex-shrink-0 w-72">
              <div className={`rounded-lg border ${stage.bgColor} mb-3`}>
                <div className="px-3 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${stage.color}`} />
                    <span className="text-sm font-semibold text-cult-white uppercase tracking-wider">{stage.label}</span>
                  </div>
                  <span className={`text-xs font-bold ${stage.color}`}>{items.length}</span>
                </div>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {items.map((prospect) => (
                  <ProspectCard
                    key={prospect.id}
                    prospect={prospect}
                    isMoving={movingId === prospect.id}
                    onNavigate={() => navigateToAccount(prospect.id)}
                    onStageChange={(newStage) => handleStageChange(prospect.id, newStage)}
                    currentStage={stage.key}
                  />
                ))}
                {items.length === 0 && (
                  <div className="px-3 py-6 text-center text-xs text-cult-medium-gray border border-dashed border-cult-charcoal rounded-lg">
                    No prospects
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Closed sections */}
      {(closedWon.length > 0 || closedLost.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {closedWon.length > 0 && (
            <ClosedSection
              title="Closed Won"
              icon={Trophy}
              color="text-cult-success"
              borderColor="border-cult-success/30"
              prospects={closedWon}
              onNavigate={navigateToAccount}
            />
          )}
          {closedLost.length > 0 && (
            <ClosedSection
              title="Closed Lost"
              icon={XCircle}
              color="text-cult-danger"
              borderColor="border-cult-danger/30"
              prospects={closedLost}
              onNavigate={navigateToAccount}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ProspectCard({
  prospect,
  isMoving,
  onNavigate,
  onStageChange,
  currentStage,
}: {
  prospect: ProspectPipelineItem;
  isMoving: boolean;
  onNavigate: () => void;
  onStageChange: (stage: PipelineStage) => void;
  currentStage: PipelineStage;
}) {
  const [showMove, setShowMove] = useState(false);
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);
  const nextStage = currentIndex < STAGES.length - 2 ? STAGES[currentIndex + 1] : null; // skip closed_lost

  return (
    <div className={`bg-cult-near-black border border-cult-medium-gray rounded-lg overflow-hidden transition-all ${isMoving ? 'opacity-50' : ''}`}>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={onNavigate}
            className="text-sm font-medium text-cult-white hover:text-sky-400 transition-colors text-left truncate"
          >
            {prospect.name}
          </button>
          <button
            onClick={() => setShowMove(!showMove)}
            className="p-1 text-cult-medium-gray hover:text-cult-white transition-colors flex-shrink-0"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-1.5 space-y-1">
          {prospect.contact_name && (
            <div className="flex items-center gap-1.5 text-xs text-cult-light-gray">
              <Users className="w-3 h-3 text-cult-medium-gray" />
              <span className="truncate">{prospect.contact_name}</span>
            </div>
          )}
          {prospect.city && (
            <div className="flex items-center gap-1.5 text-xs text-cult-light-gray">
              <MapPin className="w-3 h-3 text-cult-medium-gray" />
              <span>{[prospect.city, prospect.state].filter(Boolean).join(', ')}</span>
            </div>
          )}
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1 text-xs text-cult-silver">
              <Clock className="w-3 h-3" />
              <span>{prospect.days_in_stage}d in stage</span>
            </div>
            {prospect.open_task_count > 0 && (
              <div className="flex items-center gap-1 text-xs text-cult-warning">
                <ClipboardList className="w-3 h-3" />
                <span>{prospect.open_task_count} task{prospect.open_task_count !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick contact icons */}
        <div className="flex items-center gap-1 mt-2">
          {prospect.phone && (
            <a
              href={`tel:${prospect.phone}`}
              className="p-1 rounded hover:bg-sky-500/15 text-cult-medium-gray hover:text-sky-400 transition-colors"
              title={prospect.phone}
            >
              <Phone className="w-3 h-3" />
            </a>
          )}
          {prospect.email && (
            <a
              href={`mailto:${prospect.email}`}
              className="p-1 rounded hover:bg-sky-500/15 text-cult-medium-gray hover:text-sky-400 transition-colors"
              title={prospect.email}
            >
              <Mail className="w-3 h-3" />
            </a>
          )}
          {nextStage && (
            <button
              onClick={() => onStageChange(nextStage.key)}
              className={`ml-auto flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${nextStage.bgColor} ${nextStage.color} hover:opacity-80 transition-opacity`}
              title={`Move to ${nextStage.label}`}
            >
              {nextStage.label}
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded move menu */}
      {showMove && (
        <div className="border-t border-cult-charcoal px-3 py-2 bg-cult-dark-gray/50">
          <p className="text-xs text-cult-silver mb-1.5 uppercase tracking-wider">Move to:</p>
          <div className="flex flex-wrap gap-1">
            {STAGES.filter((s) => s.key !== currentStage).map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  onClick={() => { onStageChange(s.key); setShowMove(false); }}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${s.bgColor} ${s.color} hover:opacity-80`}
                >
                  <Icon className="w-3 h-3" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ClosedSection({
  title,
  icon: Icon,
  color,
  borderColor,
  prospects,
  onNavigate,
}: {
  title: string;
  icon: typeof Trophy;
  color: string;
  borderColor: string;
  prospects: ProspectPipelineItem[];
  onNavigate: (id: string) => void;
}) {
  return (
    <div className={`bg-cult-near-black border ${borderColor} rounded-lg overflow-hidden`}>
      <div className="px-4 py-3 border-b border-cult-charcoal flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">{title}</h3>
        </div>
        <span className={`text-xs font-bold ${color}`}>{prospects.length}</span>
      </div>
      <div className="divide-y divide-cult-charcoal/50">
        {prospects.map((p) => (
          <button
            key={p.id}
            onClick={() => onNavigate(p.id)}
            className="w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-cult-dark-gray/40 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-cult-white">{p.name}</p>
              <p className="text-xs text-cult-silver">
                {p.city && `${p.city}, ${p.state}`}
                {p.contact_name && ` · ${p.contact_name}`}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-cult-medium-gray" />
          </button>
        ))}
      </div>
    </div>
  );
}

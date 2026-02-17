/**
 * Audit Management
 *
 * Main page for managing inventory audits.
 * Displays current audit, history, and provides audit initiation.
 */

import { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, XCircle, Download, Plus, Lock, Unlock } from 'lucide-react';
import { notificationService } from '@/services/notification.service';
import { useAudit, useAuditHistory, useAuditPDF } from '../hooks';
import { AuditInitiationModal } from './AuditInitiationModal';
import { AuditLineEditor } from './AuditLineEditor';
import type { AuditInitiationRequest, AuditLineUpdateRequest } from '../types';

const AVAILABLE_STAGES = ['Bulk', 'Binned', 'Bucked', 'Packaged'];

export function AuditManagement() {
  const [showInitModal, setShowInitModal] = useState(false);
  const [view, setView] = useState<'current' | 'history'>('current');

  const {
    audit,
    lines,
    activeAudit,
    isLoading,
    isSaving,
    error,
    initiateAudit,
    updateLine,
    completeAudit,
    cancelAudit,
    lockStages,
    unlockStages,
    loadActiveAudit,
    refresh
  } = useAudit();

  const { audits: historyAudits, isLoading: historyLoading, refresh: refreshHistory } = useAuditHistory();
  const { isGenerating, error: pdfError, generateAuditPDF } = useAuditPDF();

  useEffect(() => {
    loadActiveAudit();
  }, []);

  const handleInitiateAudit = async (request: AuditInitiationRequest) => {
    const response = await initiateAudit(request);
    if (response) {
      setShowInitModal(false);
      await refresh();
    }
  };

  const handleUpdateLine = async (request: AuditLineUpdateRequest) => {
    return await updateLine(request);
  };

  const handleCompleteAudit = async () => {
    if (!audit) return;

    const confirmed = window.confirm(
      `Are you sure you want to complete this audit?\n\n` +
      `This will:\n` +
      `- Apply all confirmed adjustments to inventory\n` +
      `- Log all variances\n` +
      `- Unlock the audited stages\n` +
      `- Close the audit\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) return;

    const summary = await completeAudit();
    if (summary) {
      notificationService.success(
        `Audit completed successfully!\n\n` +
        `Adjustments Applied: ${summary.adjustments_applied}\n` +
        `Variances Logged: ${summary.variances_logged}\n` +
        `Average Variance: ${summary.average_variance_percentage.toFixed(2)}%`
      );
      await refresh();
      refreshHistory();
    }
  };

  const handleCancelAudit = async () => {
    if (!audit) return;

    const reason = window.prompt('Please provide a reason for cancelling this audit:');
    if (!reason) return;

    const success = await cancelAudit(reason);
    if (success) {
      await refresh();
      refreshHistory();
    }
  };

  const handleLockStages = async () => {
    if (!audit) return;
    const success = await lockStages();
    if (success) {
      notificationService.success('Stages locked successfully');
      await refresh();
    }
  };

  const handleUnlockStages = async () => {
    if (!audit) return;

    const confirmed = window.confirm(
      'Are you sure you want to unlock the stages?\n\n' +
      'This will allow inventory modifications during the audit.'
    );

    if (!confirmed) return;

    const success = await unlockStages();
    if (success) {
      notificationService.info('Stages unlocked');
      await refresh();
    }
  };

  const handleDownloadPDF = async () => {
    if (!audit) return;
    await generateAuditPDF(audit, lines);
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      initiated: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
      in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle }
    };

    const config = configs[status as keyof typeof configs] || configs.initiated;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        <Icon className="h-4 w-4 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const canComplete = audit && audit.status !== 'completed' && audit.status !== 'cancelled' &&
    lines.every(line => line.confirmed);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Inventory Audits</h1>
          <button
            onClick={() => setShowInitModal(true)}
            disabled={!!activeAudit}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Audit
          </button>
        </div>

        {/* View Tabs */}
        <div className="flex space-x-2 border-b border-gray-200">
          <button
            onClick={() => setView('current')}
            className={`px-4 py-2 font-medium transition-colors ${
              view === 'current'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Current Audit
          </button>
          <button
            onClick={() => setView('history')}
            className={`px-4 py-2 font-medium transition-colors ${
              view === 'history'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Current Audit View */}
      {view === 'current' && (
        <div>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading audit...</p>
            </div>
          ) : audit ? (
            <div className="space-y-6">
              {/* Audit Header */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{audit.audit_number}</h2>
                    <div className="flex items-center space-x-4">
                      {getStatusBadge(audit.status)}
                      {audit.is_locked && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                          <Lock className="h-4 w-4 mr-1" />
                          Stages Locked
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {audit.status === 'initiated' || audit.status === 'in_progress' ? (
                      <>
                        {audit.is_locked ? (
                          <button
                            onClick={handleUnlockStages}
                            className="flex items-center px-3 py-2 text-orange-600 border border-orange-300 rounded-lg hover:bg-orange-50"
                          >
                            <Unlock className="h-4 w-4 mr-1" />
                            Unlock
                          </button>
                        ) : (
                          <button
                            onClick={handleLockStages}
                            className="flex items-center px-3 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
                          >
                            <Lock className="h-4 w-4 mr-1" />
                            Lock
                          </button>
                        )}
                        <button
                          onClick={handleDownloadPDF}
                          disabled={isGenerating}
                          className="flex items-center px-3 py-2 text-green-600 border border-green-300 rounded-lg hover:bg-green-50 disabled:opacity-50"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          {isGenerating ? 'Generating...' : 'PDF'}
                        </button>
                        <button
                          onClick={handleCompleteAudit}
                          disabled={!canComplete || isSaving}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Complete Audit
                        </button>
                        <button
                          onClick={handleCancelAudit}
                          disabled={isSaving}
                          className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleDownloadPDF}
                        disabled={isGenerating}
                        className="flex items-center px-3 py-2 text-green-600 border border-green-300 rounded-lg hover:bg-green-50 disabled:opacity-50"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        {isGenerating ? 'Generating...' : 'Download PDF'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Audit Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-600">Created</div>
                    <div className="font-medium">{new Date(audit.created_at).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Stages</div>
                    <div className="font-medium">{audit.selected_stages.join(', ')}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total Lines</div>
                    <div className="font-medium">{audit.total_lines}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Variances</div>
                    <div className="font-medium">{audit.variance_count}</div>
                  </div>
                </div>

                {audit.notes && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Notes:</div>
                    <div className="text-sm text-gray-900">{audit.notes}</div>
                  </div>
                )}
              </div>

              {/* Audit Lines */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Audit Lines</h3>
                <AuditLineEditor
                  lines={lines}
                  onUpdateLine={handleUpdateLine}
                  isReadOnly={audit.status === 'completed' || audit.status === 'cancelled'}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No active audit</p>
              <button
                onClick={() => setShowInitModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Start New Audit
              </button>
            </div>
          )}
        </div>
      )}

      {/* History View */}
      {view === 'history' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Audit History</h3>
          {historyLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : historyAudits.length > 0 ? (
            <div className="space-y-3">
              {historyAudits.map(historyAudit => (
                <div key={historyAudit.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{historyAudit.audit_number}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(historyAudit.created_at).toLocaleDateString()} • {historyAudit.selected_stages.join(', ')}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right text-sm">
                        <div className="text-gray-600">Lines: {historyAudit.total_lines}</div>
                        <div className="text-gray-600">Variances: {historyAudit.variance_count}</div>
                      </div>
                      {getStatusBadge(historyAudit.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No audit history</p>
            </div>
          )}
        </div>
      )}

      {/* Initiation Modal */}
      <AuditInitiationModal
        isOpen={showInitModal}
        onClose={() => setShowInitModal(false)}
        onSubmit={handleInitiateAudit}
        availableStages={AVAILABLE_STAGES}
        isLoading={isSaving}
        error={error}
      />

      {/* Error Display */}
      {(error || pdfError) && (
        <div className="fixed bottom-4 right-4 p-4 bg-red-50 border border-red-200 rounded-lg shadow-lg max-w-md">
          <p className="text-sm text-red-800">{error || pdfError}</p>
        </div>
      )}
    </div>
  );
}

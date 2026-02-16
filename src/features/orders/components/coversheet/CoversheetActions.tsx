/**
 * Coversheet Actions Component
 *
 * Provides UI controls for coversheet management:
 * - Generate new coversheet
 * - Regenerate outdated coversheet
 * - Copy coversheet URL
 * - View existing coversheet
 * - Status indicators (outdated warning, generation state)
 *
 * This component is used in Order Details views to give staff quick access
 * to coversheet functionality.
 *
 * @component
 * @example
 * <CoversheetActions
 *   orderId="uuid-here"
 *   existingCoversheet={coversheet}
 *   onGenerated={(url) => console.log('Generated:', url)}
 * />
 */

import { useState } from 'react';
import { FileText, AlertTriangle, CheckCircle2, RefreshCw, Copy, Eye } from 'lucide-react';
import { generateCoversheet, regenerateCoversheet, getCoversheetPublicUrl } from '../../services/coversheet.service';
import { CoversheetSidePanel } from './CoversheetSidePanel';
import type { Coversheet } from '@/types';

interface CoversheetActionsProps {
  /**
   * UUID of the order to generate coversheet for
   */
  orderId: string;

  /**
   * Existing coversheet data (if already generated)
   */
  existingCoversheet?: Coversheet | null;

  /**
   * Callback when coversheet is successfully generated/regenerated
   */
  onGenerated?: (url: string) => void;

  /**
   * Optional: Custom class name for container
   */
  className?: string;
}

/**
 * CoversheetActions Component
 *
 * Renders action buttons and status indicators for coversheet management.
 *
 * Features:
 * - Generate/Regenerate buttons with loading states
 * - "Outdated" warning when order changes after generation
 * - Copy URL to clipboard action
 * - View coversheet link
 * - Access count display
 * - Error handling with user-friendly messages
 *
 * Button States:
 * 1. No coversheet: Show "Generate Coversheet" button
 * 2. Current coversheet: Show "View" and "Copy URL" buttons
 * 3. Outdated coversheet: Show warning + "Regenerate" button
 * 4. Generating: Show loading spinner
 *
 * Design notes:
 * - Uses Cult Cannabis black/white theme
 * - Accessible button states and focus styles
 * - Clear visual feedback for all actions
 * - Responsive layout for different screen sizes
 */
export function CoversheetActions({
  orderId,
  existingCoversheet,
  onGenerated,
  className = ''
}: CoversheetActionsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const coversheetUrl = existingCoversheet
    ? getCoversheetPublicUrl(existingCoversheet.access_token)
    : null;

  /**
   * Handle coversheet generation (new or regeneration)
   */
  const handleGenerate = async (regenerate: boolean = false) => {
    setIsGenerating(true);
    setError(null);

    try {
      const result = regenerate
        ? await regenerateCoversheet(orderId)
        : await generateCoversheet(orderId);

      const url = getCoversheetPublicUrl(result.access_token);
      onGenerated?.(url);

      // Optional: Show success notification
      console.log(`Coversheet ${regenerate ? 'regenerated' : 'generated'} successfully:`, url);
    } catch (err) {
      console.error('Failed to generate coversheet:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate coversheet');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Copy coversheet URL to clipboard
   */
  const handleCopyUrl = async () => {
    if (!coversheetUrl) return;

    try {
      await navigator.clipboard.writeText(coversheetUrl);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
      setError('Failed to copy URL to clipboard');
    }
  };

  const handleViewCoversheet = () => {
    setShowPreview(true);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Outdated Warning */}
      {existingCoversheet?.is_outdated && (
        <div className="bg-yellow-900/20 border border-yellow-600 rounded p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-yellow-200 font-semibold mb-1">
              Coversheet Outdated
            </p>
            <p className="text-yellow-300 text-sm">
              This order was modified after the coversheet was generated.
              Regenerate to include the latest changes.
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-600 rounded p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Generate/Regenerate Button */}
        {!existingCoversheet ? (
          <button
            onClick={() => handleGenerate(false)}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-6 py-3 bg-cult-white text-cult-black hover:bg-cult-off-white disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold uppercase tracking-wider"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Generate Coversheet
              </>
            )}
          </button>
        ) : existingCoversheet.is_outdated ? (
          <button
            onClick={() => handleGenerate(true)}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold uppercase tracking-wider"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Regenerate Coversheet
              </>
            )}
          </button>
        ) : (
          <>
            {/* View Button */}
            <button
              onClick={handleViewCoversheet}
              className="inline-flex items-center gap-2 px-6 py-3 bg-cult-white text-cult-black hover:bg-cult-off-white transition-all font-bold uppercase tracking-wider"
            >
              <Eye className="w-5 h-5" />
              View Coversheet
            </button>

            {/* Copy URL Button */}
            <button
              onClick={handleCopyUrl}
              className="inline-flex items-center gap-2 px-4 py-3 bg-cult-near-black border border-cult-medium-gray text-cult-white hover:bg-cult-black transition-all"
            >
              {copiedToClipboard ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy URL
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Coversheet Info */}
      {existingCoversheet && !existingCoversheet.is_outdated && (
        <div className="flex items-center gap-4 text-sm text-cult-lighter-gray">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span>Coversheet Active</span>
          </div>

          {existingCoversheet.accessed_count !== null && existingCoversheet.accessed_count > 0 && (
            <div>
              Accessed {existingCoversheet.accessed_count} time{existingCoversheet.accessed_count !== 1 ? 's' : ''}
            </div>
          )}

          {existingCoversheet.created_at && (
            <div>
              Generated {new Date(existingCoversheet.created_at).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      {showPreview && existingCoversheet && (
        <CoversheetSidePanel
          accessToken={existingCoversheet.access_token}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

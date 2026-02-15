import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Printer, AlertTriangle } from 'lucide-react';
import {
  getComplianceHeaderData,
  getBatchComplianceInfo,
  getDistributedToInfo
} from '../../features/orders/services/coversheet.service';
import {
  ComplianceHeader,
  BatchComplianceTable,
  DistributedToSection,
  PackageManifestSection
} from '../../features/orders/components/coversheet';
import type { ComplianceHeader as ComplianceHeaderData, BatchComplianceInfo, DistributedToInfo } from '../../types';

interface Coversheet {
  id: string;
  coversheet_number: string;
  order_id: string;
  customer_name: string;
  delivery_date: string;
  total_packages: number;
  total_weight_grams: number;
  items_summary: any[];
  qr_code_data: string;
  created_at: string;
  is_outdated?: boolean;
  last_order_update?: string;
}

export function CoversheetPublic() {
  const [coversheet, setCoversheet] = useState<Coversheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compliance data state
  const [complianceHeader, setComplianceHeader] = useState<ComplianceHeaderData | null>(null);
  const [batchCompliance, setBatchCompliance] = useState<BatchComplianceInfo[]>([]);
  const [distributedTo, setDistributedTo] = useState<DistributedToInfo | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      setError('Invalid coversheet link');
      setLoading(false);
      return;
    }

    loadCoversheet(token);
  }, []);

  async function loadCoversheet(token: string) {
    try {
      const { data, error: fetchError } = await supabase
        .from('coversheets')
        .select('*')
        .eq('access_token', token)
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError('Coversheet not found or has been deactivated');
        return;
      }

      setCoversheet(data);

      await supabase
        .from('coversheets')
        .update({
          accessed_count: (data.accessed_count || 0) + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', data.id);

      setLoadingDetails(true);
      const [
        complianceHeaderData,
        batchComplianceData,
        distributedToData
      ] = await Promise.all([
        getComplianceHeaderData(),
        getBatchComplianceInfo(data.order_id),
        getDistributedToInfo(data.order_id)
      ]);

      setComplianceHeader(complianceHeaderData);
      setBatchCompliance(batchComplianceData);
      setDistributedTo(distributedToData);
      setLoadingDetails(false);

    } catch (err) {
      console.error('Error loading coversheet:', err);
      setError('Failed to load coversheet');
    } finally {
      setLoading(false);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-800 text-xl font-semibold">Loading coversheet...</div>
      </div>
    );
  }

  if (error || !coversheet) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="border-2 border-red-600 bg-red-50 p-8 max-w-md rounded">
          <h2 className="text-xl font-bold text-red-600 mb-2 uppercase">Error</h2>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Print Button - Hidden on print */}
      <div className="print:hidden fixed top-4 right-4 z-50">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-3 bg-black text-white hover:bg-gray-800 transition-colors font-semibold rounded shadow-lg"
        >
          <Printer className="w-5 h-5" />
          Print Coversheet
        </button>
      </div>

      {/* Main Content - Centered for print */}
      <div className="max-w-4xl mx-auto px-8 py-12 print:px-0 print:py-0">

        {/* Outdated Warning - Hidden on print */}
        {coversheet.is_outdated && (
          <div className="print:hidden bg-yellow-50 border-2 border-yellow-500 rounded-lg p-6 mb-8 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-yellow-800 font-bold text-lg mb-2">Coversheet Outdated</h3>
              <p className="text-yellow-700">
                This order was modified on {coversheet.last_order_update ? new Date(coversheet.last_order_update).toLocaleString() : 'recently'}.
                The information shown may not reflect the latest changes. Please contact us for an updated coversheet.
              </p>
            </div>
          </div>
        )}

        {/* Compliance Header */}
        {complianceHeader && (
          <div className="mb-8 print:mb-6">
            <ComplianceHeader data={complianceHeader} />
          </div>
        )}

        {/* Batch Compliance Table */}
        {!loadingDetails && batchCompliance.length > 0 && (
          <div className="mb-8 print:mb-6">
            <BatchComplianceTable batches={batchCompliance} showCoaLinks={true} />
          </div>
        )}

        {/* Distributed To Section */}
        {!loadingDetails && distributedTo && (
          <div className="mb-8 print:mb-6">
            <DistributedToSection data={distributedTo} />
          </div>
        )}

        {/* Package Manifest Section */}
        {!loadingDetails && coversheet.order_id && (
          <div className="mb-8 print:mb-6">
            <PackageManifestSection orderId={coversheet.order_id} showLabelStatus={true} />
          </div>
        )}

        {/* Loading State */}
        {loadingDetails && (
          <div className="text-center py-12">
            <div className="text-gray-600">Loading compliance details...</div>
          </div>
        )}

        {/* Footer - Generated timestamp */}
        <div className="mt-12 print:mt-8 pt-6 border-t-2 border-gray-300 text-center text-sm text-gray-600">
          <p>Coversheet Generated: {new Date(coversheet.created_at).toLocaleString()}</p>
          <p className="mt-1">Document Number: {coversheet.coversheet_number}</p>
          <p className="mt-1 print:hidden">This document is for authorized recipients only</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
          }

          @page {
            margin: 0.75in;
            size: letter;
          }

          .print\\:hidden {
            display: none !important;
          }

          .print\\:px-0 {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }

          .print\\:py-0 {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }

          .print\\:mb-6 {
            margin-bottom: 1.5rem !important;
          }

          .print\\:mt-8 {
            margin-top: 2rem !important;
          }

          /* Prevent page breaks inside tables and sections */
          table, .compliance-section {
            page-break-inside: avoid;
          }

          /* Force black text for print */
          * {
            color: black !important;
            background: white !important;
          }

          /* Keep borders visible */
          [class*="border"] {
            border-color: black !important;
          }

          /* Ensure logo prints */
          img {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}

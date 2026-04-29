import { useEffect, useState } from 'react';
import { Calendar, Package, ChevronDown, ChevronRight, FileText, Printer } from 'lucide-react';
import { Button } from '@/shared/components';
import { getConsolidatedPackages, getPackageSources, type ConsolidatedPackage, type PackageSource } from '../services';

export function EODSummary() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [packages, setPackages] = useState<ConsolidatedPackage[]>([]);
  const [expandedStrains, setExpandedStrains] = useState<Set<string>>(new Set());
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());
  const [packageSources, setPackageSources] = useState<{[key: string]: PackageSource[]}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConsolidatedPackages();
  }, [selectedDate]);

  const fetchConsolidatedPackages = async () => {
    setLoading(true);
    const { data } = await getConsolidatedPackages(selectedDate);
    setPackages(data || []);
    setLoading(false);
  };

  const fetchPackageSources = async (packageId: string) => {
    if (packageSources[packageId]) return;

    const { data } = await getPackageSources(packageId);
    setPackageSources(prev => ({ ...prev, [packageId]: data || [] }));
  };

  const toggleStrain = (strain: string) => {
    const newExpanded = new Set(expandedStrains);
    if (newExpanded.has(strain)) {
      newExpanded.delete(strain);
    } else {
      newExpanded.add(strain);
    }
    setExpandedStrains(newExpanded);
  };

  const togglePackage = (packageId: string) => {
    const newExpanded = new Set(expandedPackages);
    if (newExpanded.has(packageId)) {
      newExpanded.delete(packageId);
    } else {
      newExpanded.add(packageId);
      fetchPackageSources(packageId);
    }
    setExpandedPackages(newExpanded);
  };

  const groupedPackages = packages.reduce((acc, pkg) => {
    if (!acc[pkg.strain]) {
      acc[pkg.strain] = [];
    }
    acc[pkg.strain].push(pkg);
    return acc;
  }, {} as {[key: string]: ConsolidatedPackage[]});

  const handlePrint = () => {
    window.print();
  };

  const stats = {
    totalPackages: packages.length,
    totalStrains: Object.keys(groupedPackages).length,
    totalWeight: packages
      .filter(p => p.product_stage === 'Bulk')
      .reduce((sum, p) => sum + p.total_weight_grams, 0),
    totalUnits: packages
      .filter(p => p.product_stage === 'Packaged')
      .reduce((sum, p) => sum + p.total_units, 0),
  };

  if (loading) {
    return <div className="p-6">Loading EOD summary...</div>;
  }

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">End of Day Summary</h1>
          <p className="text-cult-text-secondary mt-1">Consolidated packages ready for Dutchie conversion</p>
        </div>
        <Button
          onClick={handlePrint}
          icon={<Printer className="w-5 h-5" />}
          className="print:hidden"
        >
          Print Report
        </Button>
      </div>

      <div className="bg-cult-surface p-4 rounded-lg shadow border border-cult-border mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cult-text-primary" />
            <label className="text-sm font-medium text-cult-text-primary">Select Date:</label>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-3 bg-cult-black text-cult-text-primary border border-cult-surface-raised rounded-cult focus:ring-2 focus:ring-cult-danger/50 focus:border-cult-danger transition-all duration-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 print:grid-cols-4">
        <div className="bg-cult-surface p-4 rounded-lg shadow border border-cult-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-cult-text-muted">Total Packages</p>
              <p className="text-2xl font-bold text-cult-text-primary">{stats.totalPackages}</p>
            </div>
            <Package className="w-8 h-8 text-cult-green" />
          </div>
        </div>
        <div className="bg-cult-surface p-4 rounded-lg shadow border border-cult-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-cult-text-muted">Strains</p>
              <p className="text-2xl font-bold text-cult-text-primary">{stats.totalStrains}</p>
            </div>
            <FileText className="w-8 h-8 text-cult-info" />
          </div>
        </div>
        <div className="bg-cult-surface p-4 rounded-lg shadow border border-cult-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-cult-text-muted">Total Bulk (g)</p>
              <p className="text-2xl font-bold text-cult-text-primary">{stats.totalWeight.toFixed(0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-cult-surface p-4 rounded-lg shadow border border-cult-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-cult-text-muted">Total Units</p>
              <p className="text-2xl font-bold text-cult-text-primary">{stats.totalUnits}</p>
            </div>
          </div>
        </div>
      </div>

      {packages.length === 0 ? (
        <div className="bg-cult-surface rounded-lg shadow border border-cult-border p-12 text-center">
          <Package className="w-16 h-16 text-cult-text-muted mx-auto mb-4" />
          <p className="text-cult-text-muted text-lg">No consolidated packages for this date</p>
          <p className="text-cult-text-muted text-sm mt-2">Complete trim or packaging sessions to generate packages</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedPackages).map(([strain, strainPackages]) => (
            <div key={strain} className="bg-cult-surface rounded-lg shadow border border-cult-border overflow-hidden">
              <button
                onClick={() => toggleStrain(strain)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-cult-surface transition-colors print:bg-cult-surface"
              >
                <div className="flex items-center gap-3">
                  {expandedStrains.has(strain) ? (
                    <ChevronDown className="w-5 h-5 text-cult-text-primary print:hidden" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-cult-text-primary print:hidden" />
                  )}
                  <h2 className="text-xl font-bold text-cult-text-primary">{strain}</h2>
                  <span className="text-sm text-cult-text-muted">({strainPackages.length} packages)</span>
                </div>
                <div className="text-sm text-cult-text-muted">
                  {strainPackages.find(p => p.strain_abbreviation)?.strain_abbreviation || ''}
                </div>
              </button>

              {expandedStrains.has(strain) && (
                <div className="border-t border-cult-border">
                  {strainPackages.map((pkg) => (
                    <div key={pkg.id} className="border-b border-cult-border last:border-b-0">
                      <button
                        onClick={() => togglePackage(pkg.id)}
                        className="w-full px-6 py-4 hover:bg-cult-surface transition-colors flex items-center justify-between print:bg-cult-surface"
                      >
                        <div className="flex items-center gap-4">
                          {expandedPackages.has(pkg.id) ? (
                            <ChevronDown className="w-4 h-4 text-cult-text-muted print:hidden" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-cult-text-muted print:hidden" />
                          )}
                          <div className="text-left">
                            <p className="font-mono font-bold text-cult-green text-lg">{pkg.package_id}</p>
                            <p className="text-sm text-cult-text-muted">
                              {pkg.product_stage} - {pkg.product_type}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {pkg.product_stage === 'Bulk' ? (
                            <p className="text-lg font-bold text-cult-text-primary">{pkg.total_weight_grams.toFixed(1)}g</p>
                          ) : (
                            <p className="text-lg font-bold text-cult-text-primary">{pkg.total_units} units</p>
                          )}
                          <p className="text-xs text-cult-text-muted">{pkg.session_count} session{pkg.session_count !== 1 ? 's' : ''}</p>
                        </div>
                      </button>

                      {expandedPackages.has(pkg.id) && packageSources[pkg.id] && (
                        <div className="bg-cult-surface px-6 py-4">
                          <p className="text-sm font-medium text-cult-text-primary mb-3">Contributing Sessions:</p>
                          <div className="space-y-2">
                            {packageSources[pkg.id].map((source, idx) => (
                              <div key={source.id} className="flex items-center justify-between text-sm bg-cult-surface px-4 py-2 rounded">
                                <span className="text-cult-text-muted">
                                  {source.session_type === 'trim' ? 'Trim Session' : 'Packaging Session'} #{idx + 1}
                                </span>
                                <span className="text-cult-text-primary font-medium">
                                  {source.contribution_weight_grams > 0
                                    ? `${source.contribution_weight_grams.toFixed(1)}g`
                                    : `${source.contribution_units} units`}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-cult-border">
                            <p className="text-xs text-cult-text-muted">
                              <span className="font-medium">Room:</span> {pkg.room}
                            </p>
                            <p className="text-xs text-cult-text-muted mt-1">
                              <span className="font-medium">Created:</span> {new Date(pkg.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .bg-cult-surface {
            background: white !important;
            border: 1px solid #000 !important;
          }
          .bg-cult-surface {
            background: #f5f5f5 !important;
          }
          .text-cult-text-primary {
            color: #000 !important;
          }
          .text-cult-text-muted {
            color: #666 !important;
          }
          .text-cult-green {
            color: #000 !important;
            font-weight: bold;
          }
          button {
            cursor: default;
          }
        }
      `}</style>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Database } from '@/lib/database/database.types';
import { FileText, Printer, CheckSquare } from 'lucide-react';
import { getProductionData } from '../services';

type TrimSession = Database['public']['Tables']['trim_sessions']['Row'] & {
  recorded_in_dutchie?: boolean;
  big_buds_grams?: number;
  small_buds_grams?: number;
  trim_grams?: number;
  trimmer_name?: string;
  package_id?: string;
  pulled_weight?: number;
};

type PackagingSession = Database['public']['Tables']['packaging_sessions']['Row'] & {
  recorded_in_dutchie?: boolean;
  units_3_5g?: number;
  units_14g?: number;
  units_454g?: number;
  packager_name?: string;
  package_id?: string;
  pull_weight?: number;
};

export function ProductionSummary() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [trimSessions, setTrimSessions] = useState<TrimSession[]>([]);
  const [packagingSessions, setPackagingSessions] = useState<PackagingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductionData();
  }, [selectedDate]);

  const fetchProductionData = async () => {
    setLoading(true);
    const { trimSessions: trim, packagingSessions: packaging } = await getProductionData(selectedDate);
    setTrimSessions(trim);
    setPackagingSessions(packaging);
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };



  const calculateTotals = () => {
    return {
      trimSessions: trimSessions.length,
      trimPending: trimSessions.filter(s => !s.recorded_in_dutchie).length,
      packagingSessions: packagingSessions.length,
      packagingPending: packagingSessions.filter(s => !s.recorded_in_dutchie).length,
      totalFlower: trimSessions.reduce((sum, s) => sum + (s.big_buds_grams || 0), 0),
      totalSmalls: trimSessions.reduce((sum, s) => sum + (s.small_buds_grams || 0), 0),
      totalTrim: trimSessions.reduce((sum, s) => sum + (s.trim_grams || 0), 0),
      total_3_5g: packagingSessions.reduce((sum, s) => sum + (s.units_3_5g || 0), 0),
      total_14g: packagingSessions.reduce((sum, s) => sum + (s.units_14g || 0), 0),
      total_454g: packagingSessions.reduce((sum, s) => sum + (s.units_454g || 0), 0),
    };
  };

  const totals = calculateTotals();

  if (loading) {
    return <div className="p-6 text-white">Loading production summary...</div>;
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center mb-6 print:mb-4">
        <div>
          <h1 className="text-3xl font-bold text-white print:text-black">Daily Production Summary</h1>
          <p className="text-cult-text-secondary mt-1 print:text-cult-text-muted">Complete activity report for Dutchie entry</p>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-cult-dark-gray text-cult-white border border-cult-medium-gray rounded focus:ring-2 focus:ring-cult-green focus:border-cult-green"
          />
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-cult-dark-gray text-cult-white px-4 py-2 rounded border border-cult-medium-gray hover:border-cult-white transition"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 print:mb-4">
        <div className="bg-cult-near-black print:bg-white print:border print:border-cult-border p-4 rounded-lg shadow border border-cult-medium-gray">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-cult-light-gray print:text-cult-text-faint">Trim Sessions</p>
              <p className="text-2xl font-bold text-cult-white print:text-black">{totals.trimSessions}</p>
              {totals.trimPending > 0 && (
                <p className="text-xs text-cult-warning print:text-orange-600">{totals.trimPending} pending entry</p>
              )}
            </div>
            <FileText className="w-8 h-8 text-cult-success print:text-green-600" />
          </div>
        </div>
        <div className="bg-cult-near-black print:bg-white print:border print:border-cult-border p-4 rounded-lg shadow border border-cult-medium-gray">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-cult-light-gray print:text-cult-text-faint">Packaging Sessions</p>
              <p className="text-2xl font-bold text-cult-white print:text-black">{totals.packagingSessions}</p>
              {totals.packagingPending > 0 && (
                <p className="text-xs text-cult-warning print:text-orange-600">{totals.packagingPending} pending entry</p>
              )}
            </div>
            <FileText className="w-8 h-8 text-cult-info print:text-blue-600" />
          </div>
        </div>
        <div className="bg-cult-near-black print:bg-white print:border print:border-cult-border p-4 rounded-lg shadow border border-cult-medium-gray">
          <div>
            <p className="text-sm text-cult-light-gray print:text-cult-text-faint">Flower Output</p>
            <p className="text-2xl font-bold text-cult-success print:text-green-700">{totals.totalFlower.toFixed(0)}g</p>
          </div>
        </div>
        <div className="bg-cult-near-black print:bg-white print:border print:border-cult-border p-4 rounded-lg shadow border border-cult-medium-gray">
          <div>
            <p className="text-sm text-cult-light-gray print:text-cult-text-faint">Total Units Packaged</p>
            <p className="text-2xl font-bold text-cult-info print:text-blue-700">{totals.total_3_5g + totals.total_14g + totals.total_454g}</p>
          </div>
        </div>
      </div>

      <div className="bg-cult-near-black print:bg-white print:border print:border-cult-border rounded-lg shadow border border-cult-medium-gray mb-6">
        <div className="p-4 border-b border-cult-medium-gray print:border-cult-border">
          <h2 className="text-xl font-bold text-cult-white print:text-black">Trim Activity</h2>
          <p className="text-sm text-cult-light-gray print:text-cult-text-faint">Bucked material converted to bulk inventory</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-cult-dark-gray print:bg-cult-surface border-b border-cult-medium-gray print:border-cult-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-light-gray print:text-cult-text-muted uppercase">Trimmer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-light-gray print:text-cult-text-muted uppercase">Strain</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-light-gray print:text-cult-text-muted uppercase">Source Pkg</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-cult-light-gray print:text-cult-text-muted uppercase">Pulled</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-light-gray print:text-cult-text-muted uppercase">Output</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-light-gray print:text-cult-text-muted uppercase">Room</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-cult-light-gray print:text-cult-text-muted uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cult-medium-gray print:divide-cult-border-subtle">
              {trimSessions.map((session) => (
                <tr key={session.id} className="hover:bg-cult-dark-gray print:hover:bg-transparent">
                  <td className="px-4 py-3 text-sm text-cult-white print:text-black">{session.trimmer_name}</td>
                  <td className="px-4 py-3 text-sm text-cult-white print:text-black">{session.strain}</td>
                  <td className="px-4 py-3 text-sm text-cult-light-gray print:text-cult-text-muted font-mono text-xs">{session.package_id}</td>
                  <td className="px-4 py-3 text-sm text-right text-cult-white print:text-black">{session.pulled_weight}g</td>
                  <td className="px-4 py-3 text-sm text-cult-white print:text-black">
                    <div className="space-y-1 text-xs">
                      {session.big_buds_grams && session.big_buds_grams > 0 && (
                        <div className="text-cult-success print:text-green-700">
                          F: {session.big_buds_grams.toFixed(1)}g
                          {/* Package ID auto-generated, see EOD Summary */}
                        </div>
                      )}
                      {session.small_buds_grams && session.small_buds_grams > 0 && (
                        <div className="text-cult-warning print:text-yellow-700">
                          S: {session.small_buds_grams.toFixed(1)}g
                          {/* Package ID auto-generated, see EOD Summary */}
                        </div>
                      )}
                      {session.trim_grams && session.trim_grams > 0 && (
                        <div className="text-cult-light-gray print:text-cult-text-faint">
                          T: {session.trim_grams.toFixed(1)}g
                          {/* Package ID auto-generated, see EOD Summary */}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-cult-light-gray print:text-cult-text-muted">Holding</td>
                  <td className="px-4 py-3 text-center">
                    {session.recorded_in_dutchie ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-cult-success-muted text-cult-success">✓ Recorded</span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-cult-warning-muted text-cult-warning">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {trimSessions.length === 0 && (
            <div className="text-center py-8 text-cult-light-gray print:text-cult-text-faint">
              No trim sessions completed on this date
            </div>
          )}
        </div>
      </div>

      <div className="bg-cult-near-black print:bg-white print:border print:border-cult-border rounded-lg shadow border border-cult-medium-gray mb-6">
        <div className="p-4 border-b border-cult-medium-gray print:border-cult-border">
          <h2 className="text-xl font-bold text-cult-white print:text-black">Packaging Activity</h2>
          <p className="text-sm text-cult-light-gray print:text-cult-text-faint">Bulk inventory packaged into retail units</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-cult-dark-gray print:bg-cult-surface border-b border-cult-medium-gray print:border-cult-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-light-gray print:text-cult-text-muted uppercase">Packager</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-light-gray print:text-cult-text-muted uppercase">Strain</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-light-gray print:text-cult-text-muted uppercase">Source Pkg</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-cult-light-gray print:text-cult-text-muted uppercase">Pulled</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-light-gray print:text-cult-text-muted uppercase">Units Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-light-gray print:text-cult-text-muted uppercase">Dest Pkg</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-light-gray print:text-cult-text-muted uppercase">Room</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-cult-light-gray print:text-cult-text-muted uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cult-medium-gray print:divide-cult-border-subtle">
              {packagingSessions.map((session) => (
                <tr key={session.id} className="hover:bg-cult-dark-gray print:hover:bg-transparent">
                  <td className="px-4 py-3 text-sm text-cult-white print:text-black">{session.packager_name}</td>
                  <td className="px-4 py-3 text-sm text-cult-white print:text-black">{session.strain}</td>
                  <td className="px-4 py-3 text-sm text-cult-light-gray print:text-cult-text-muted font-mono text-xs">{session.package_id}</td>
                  <td className="px-4 py-3 text-sm text-right text-cult-white print:text-black">{session.pull_weight}g</td>
                  <td className="px-4 py-3 text-sm text-cult-white print:text-black">
                    <div className="space-y-1 text-xs">
                      {session.units_3_5g && session.units_3_5g > 0 && (
                        <div className="text-cult-info print:text-blue-700">3.5g: {session.units_3_5g} units</div>
                      )}
                      {session.units_14g && session.units_14g > 0 && (
                        <div className="text-cult-info print:text-blue-700">14g: {session.units_14g} units</div>
                      )}
                      {session.units_454g && session.units_454g > 0 && (
                        <div className="text-cult-info print:text-blue-700">454g: {session.units_454g} units</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-cult-light-gray print:text-cult-text-muted font-mono text-xs">See EOD Summary</td>
                  <td className="px-4 py-3 text-sm text-cult-light-gray print:text-cult-text-muted">Holding</td>
                  <td className="px-4 py-3 text-center">
                    {session.recorded_in_dutchie ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-cult-success-muted text-cult-success">✓ Recorded</span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-cult-warning-muted text-cult-warning">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {packagingSessions.length === 0 && (
            <div className="text-center py-8 text-cult-light-gray print:text-cult-text-faint">
              No packaging sessions completed on this date
            </div>
          )}
        </div>
      </div>

      <div className="bg-cult-near-black print:bg-white print:border print:border-cult-border rounded-lg shadow border border-cult-medium-gray print:break-before-page">
        <div className="p-4 border-b border-cult-medium-gray print:border-cult-border">
          <h2 className="text-xl font-bold text-cult-white print:text-black flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            Dutchie Entry Checklist
          </h2>
          <p className="text-sm text-cult-light-gray print:text-cult-text-faint">Manual conversions to enter in Dutchie</p>
        </div>
        <div className="p-6">
          {totals.trimPending === 0 && totals.packagingPending === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-cult-white print:text-black font-medium">All sessions have been recorded in Dutchie!</p>
              <p className="text-sm text-cult-light-gray print:text-cult-text-faint mt-1">No pending entries for this date.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {trimSessions.filter(s => !s.recorded_in_dutchie).length > 0 && (
                <div>
                  <h3 className="font-bold text-cult-white print:text-black mb-3">Trim Conversions ({trimSessions.filter(s => !s.recorded_in_dutchie).length})</h3>
                  <div className="space-y-4">
                    {trimSessions.filter(s => !s.recorded_in_dutchie).map((session, idx) => (
                      <div key={session.id} className="bg-cult-dark-gray print:bg-cult-surface-sunken p-4 rounded border border-cult-medium-gray print:border-cult-border">
                        <p className="font-medium text-cult-white print:text-black mb-2">{idx + 1}. {session.strain}</p>
                        <ul className="space-y-1 text-sm text-cult-light-gray print:text-cult-text-muted">
                          <li>☐ Deduct {session.pulled_weight}g from {session.package_id}</li>
                          {session.big_buds_grams && session.big_buds_grams > 0 && (
                            <li className="ml-4">☐ Add {session.big_buds_grams.toFixed(1)}g Flower to [See EOD Summary]</li>
                          )}
                          {session.small_buds_grams && session.small_buds_grams > 0 && (
                            <li className="ml-4">☐ Add {session.small_buds_grams.toFixed(1)}g Smalls to [See EOD Summary]</li>
                          )}
                          {session.trim_grams && session.trim_grams > 0 && (
                            <li className="ml-4">☐ Add {session.trim_grams.toFixed(1)}g Trim to [See EOD Summary]</li>
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {packagingSessions.filter(s => !s.recorded_in_dutchie).length > 0 && (
                <div>
                  <h3 className="font-bold text-cult-white print:text-black mb-3">Packaging Conversions ({packagingSessions.filter(s => !s.recorded_in_dutchie).length})</h3>
                  <div className="space-y-4">
                    {packagingSessions.filter(s => !s.recorded_in_dutchie).map((session, idx) => (
                      <div key={session.id} className="bg-cult-dark-gray print:bg-cult-surface-sunken p-4 rounded border border-cult-medium-gray print:border-cult-border">
                        <p className="font-medium text-cult-white print:text-black mb-2">{idx + 1}. {session.strain}</p>
                        <ul className="space-y-1 text-sm text-cult-light-gray print:text-cult-text-muted">
                          <li>☐ Deduct {session.pull_weight}g from {session.package_id}</li>
                          {session.units_3_5g && session.units_3_5g > 0 && (
                            <li className="ml-4">☐ Add {session.units_3_5g} units 3.5g to [See EOD Summary]</li>
                          )}
                          {session.units_14g && session.units_14g > 0 && (
                            <li className="ml-4">☐ Add {session.units_14g} units 14g to [See EOD Summary]</li>
                          )}
                          {session.units_454g && session.units_454g > 0 && (
                            <li className="ml-4">☐ Add {session.units_454g} units 454g to [See EOD Summary]</li>
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

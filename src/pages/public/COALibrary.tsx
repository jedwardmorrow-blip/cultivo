import { useState, useEffect } from 'react';
import { FileText, Search, Calendar, Beaker, Leaf, ArrowLeft } from 'lucide-react';
import { getActiveCOAs, getCOAPDFUrl, type COAData } from '../../features/coa/services/coa.service';
import { getCoversheetPublicUrl } from '../../features/orders/services/coversheet.service';

export function COALibrary() {
  const [coas, setCoas] = useState<COAData[]>([]);
  const [filteredCoas, setFilteredCoas] = useState<COAData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCoa, setSelectedCoa] = useState<COAData | null>(null);

  useEffect(() => {
    loadCOAs();
  }, []);

  useEffect(() => {
    filterCOAs();
  }, [searchTerm, coas]);

  async function loadCOAs() {
    try {
      const data = await getActiveCOAs();
      setCoas(data);
    } catch (error) {
      console.error('Error loading COAs:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterCOAs() {
    let filtered = coas;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(coa =>
        coa.strain_name.toLowerCase().includes(search) ||
        coa.batch_number.toLowerCase().includes(search)
      );
    }

    setFilteredCoas(filtered);
  }

  function groupCOAsByMonth(coas: COAData[]) {
    const groups: { [key: string]: COAData[] } = {};

    coas.forEach(coa => {
      if (coa.harvest_date) {
        const date = new Date(coa.harvest_date);
        const monthYear = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        if (!groups[monthYear]) {
          groups[monthYear] = [];
        }
        groups[monthYear].push(coa);
      }
    });

    return Object.entries(groups).sort((a, b) => {
      const dateA = new Date(a[1][0].harvest_date!);
      const dateB = new Date(b[1][0].harvest_date!);
      return dateB.getTime() - dateA.getTime();
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cult-black flex items-center justify-center">
        <div className="text-cult-white text-xl uppercase tracking-wider">Loading...</div>
      </div>
    );
  }

  const groupedCoas = groupCOAsByMonth(filteredCoas);

  const fromCoversheet = new URLSearchParams(window.location.search).get('from') === 'coversheet';
  const coversheetToken = new URLSearchParams(window.location.search).get('token');

  return (
    <div className="min-h-screen bg-cult-black">
      {/* Hero Section */}
      <div className="bg-cult-near-black border-b border-cult-medium-gray">
        <div className="max-w-7xl mx-auto px-4 py-16">
          {fromCoversheet && coversheetToken && (
            <div className="mb-6">
              <a
                href={getCoversheetPublicUrl(coversheetToken!)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cult-white text-cult-black hover:bg-cult-off-white transition-all font-bold uppercase tracking-wider text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Coversheet
              </a>
            </div>
          )}
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold text-cult-white uppercase tracking-wider mb-4">
              Testing Results
            </h1>
            <p className="text-xl text-cult-light-gray max-w-3xl mx-auto">
              Complete transparency. Every batch tested. Every result verified.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-4 w-5 h-5 text-cult-light-gray" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by strain or batch number..."
                className="w-full pl-12 pr-4 py-4 bg-cult-black border-2 border-cult-medium-gray text-cult-white text-lg focus:outline-none focus:border-cult-white transition-all uppercase tracking-wider placeholder-cult-lighter-gray"
              />
            </div>
          </div>
        </div>
      </div>

      {/* COA Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {groupedCoas.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-20 h-20 text-cult-medium-gray mx-auto mb-4" />
            <p className="text-cult-light-gray text-xl uppercase tracking-wider">
              {searchTerm ? 'No results found' : 'No test results available'}
            </p>
          </div>
        ) : (
          groupedCoas.map(([monthYear, monthCoas]) => (
            <div key={monthYear} className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <Calendar className="w-6 h-6 text-cult-white" />
                <h2 className="text-3xl font-bold text-cult-white uppercase tracking-wider">
                  {monthYear}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {monthCoas.map(coa => (
                  <div
                    key={coa.id}
                    onClick={() => setSelectedCoa(coa)}
                    className="bg-cult-near-black border-2 border-cult-medium-gray hover:border-cult-white transition-all cursor-pointer group"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <Leaf className="w-8 h-8 text-cult-white" />
                        <FileText className="w-6 h-6 text-cult-light-gray group-hover:text-cult-white transition-colors" />
                      </div>

                      <h3 className="text-2xl font-bold text-cult-white uppercase tracking-wide mb-2">
                        {coa.strain_name}
                      </h3>

                      <p className="text-sm text-cult-lighter-gray font-mono mb-4">
                        {coa.batch_number}
                      </p>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-cult-black p-3 border border-cult-medium-gray">
                          <div className="text-xs text-cult-light-gray uppercase tracking-wider mb-1">THC</div>
                          <div className="text-2xl font-bold text-cult-white">
                            {coa.thc_percentage !== null && coa.thc_percentage !== undefined ? coa.thc_percentage.toFixed(2) : 'N/A'}%
                          </div>
                        </div>
                        <div className="bg-cult-black p-3 border border-cult-medium-gray">
                          <div className="text-xs text-cult-light-gray uppercase tracking-wider mb-1">CBD</div>
                          <div className="text-2xl font-bold text-cult-white">
                            {coa.cbd_percentage !== null && coa.cbd_percentage !== undefined ? coa.cbd_percentage.toFixed(2) : '0.00'}%
                          </div>
                        </div>
                      </div>

                      {coa.total_terpenes_mg_g && (
                        <div className="bg-cult-black p-3 border border-cult-medium-gray mb-4">
                          <div className="text-xs text-cult-light-gray uppercase tracking-wider mb-1">
                            Total Terpenes
                          </div>
                          <div className="text-lg font-bold text-cult-white">
                            {coa.total_terpenes_mg_g.toFixed(2)} mg/g
                          </div>
                        </div>
                      )}

                      {(coa.terpene_1_name || coa.terpene_2_name || coa.terpene_3_name) && (
                        <div className="pt-4 border-t border-cult-medium-gray">
                          <div className="text-xs text-cult-light-gray uppercase tracking-wider mb-2">
                            Top Terpenes
                          </div>
                          <div className="space-y-1 text-sm">
                            {coa.terpene_1_name && (
                              <div className="text-cult-lighter-gray">
                                • {coa.terpene_1_name} ({coa.terpene_1_percentage?.toFixed(3)}%)
                              </div>
                            )}
                            {coa.terpene_2_name && (
                              <div className="text-cult-lighter-gray">
                                • {coa.terpene_2_name} ({coa.terpene_2_percentage?.toFixed(3)}%)
                              </div>
                            )}
                            {coa.terpene_3_name && (
                              <div className="text-cult-lighter-gray">
                                • {coa.terpene_3_name} ({coa.terpene_3_percentage?.toFixed(3)}%)
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-cult-medium-gray">
                        <div className="text-xs text-cult-lighter-gray">
                          Harvest: {coa.harvest_date ? new Date(coa.harvest_date).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="bg-cult-black border-t border-cult-medium-gray px-6 py-3">
                      <div className="text-xs text-cult-light-gray uppercase tracking-wider group-hover:text-cult-white transition-colors">
                        View Certificate →
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedCoa && (
        <div
          className="fixed inset-0 bg-cult-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCoa(null)}
        >
          <div
            className="bg-cult-near-black border-2 border-cult-white max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-cult-near-black border-b-2 border-cult-white p-6 flex items-center justify-between z-10">
              <h3 className="text-2xl font-bold text-cult-white uppercase tracking-wider">
                Certificate of Analysis
              </h3>
              <button
                onClick={() => setSelectedCoa(null)}
                className="text-cult-white hover:bg-cult-white hover:text-cult-black transition-all px-3 py-1 text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-cult-light-gray uppercase tracking-wider mb-2">Strain</div>
                  <div className="text-2xl font-bold text-cult-white uppercase">{selectedCoa.strain_name}</div>
                </div>
                <div>
                  <div className="text-xs text-cult-light-gray uppercase tracking-wider mb-2">Batch Number</div>
                  <div className="text-xl font-mono text-cult-white">{selectedCoa.batch_number}</div>
                </div>
                <div>
                  <div className="text-xs text-cult-light-gray uppercase tracking-wider mb-2">Harvest Date</div>
                  <div className="text-lg text-cult-white">
                    {selectedCoa.harvest_date ? new Date(selectedCoa.harvest_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-cult-light-gray uppercase tracking-wider mb-2">Sample Date</div>
                  <div className="text-lg text-cult-white">
                    {selectedCoa.sample_date ? new Date(selectedCoa.sample_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="border-t-2 border-cult-medium-gray pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <Beaker className="w-6 h-6 text-cult-white" />
                  <h4 className="text-xl font-bold text-cult-white uppercase tracking-wider">
                    Cannabinoid Profile
                  </h4>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-cult-black border-2 border-cult-medium-gray p-6 text-center">
                    <div className="text-xs text-cult-light-gray uppercase tracking-wider mb-2">THC</div>
                    <div className="text-4xl font-bold text-cult-white">
                      {selectedCoa.thc_percentage !== null && selectedCoa.thc_percentage !== undefined ? selectedCoa.thc_percentage.toFixed(2) : 'N/A'}%
                    </div>
                  </div>
                  <div className="bg-cult-black border-2 border-cult-medium-gray p-6 text-center">
                    <div className="text-xs text-cult-light-gray uppercase tracking-wider mb-2">CBD</div>
                    <div className="text-4xl font-bold text-cult-white">
                      {selectedCoa.cbd_percentage !== null && selectedCoa.cbd_percentage !== undefined ? selectedCoa.cbd_percentage.toFixed(2) : '0.00'}%
                    </div>
                  </div>
                  <div className="bg-cult-black border-2 border-cult-medium-gray p-6 text-center">
                    <div className="text-xs text-cult-light-gray uppercase tracking-wider mb-2">Total</div>
                    <div className="text-4xl font-bold text-cult-white">
                      {selectedCoa.total_cannabinoids_percentage !== null && selectedCoa.total_cannabinoids_percentage !== undefined ? selectedCoa.total_cannabinoids_percentage.toFixed(2) : 'N/A'}%
                    </div>
                  </div>
                </div>
              </div>

              {selectedCoa.total_terpenes_mg_g && (
                <div className="border-t-2 border-cult-medium-gray pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Leaf className="w-6 h-6 text-cult-white" />
                    <h4 className="text-xl font-bold text-cult-white uppercase tracking-wider">
                      Terpene Profile
                    </h4>
                  </div>

                  <div className="bg-cult-black border-2 border-cult-medium-gray p-6 mb-4">
                    <div className="text-sm text-cult-light-gray uppercase tracking-wider mb-2">
                      Total Terpenes
                    </div>
                    <div className="text-3xl font-bold text-cult-white">
                      {selectedCoa.total_terpenes_mg_g.toFixed(2)} mg/g
                    </div>
                  </div>

                  {(selectedCoa.terpene_1_name || selectedCoa.terpene_2_name || selectedCoa.terpene_3_name) && (
                    <div className="space-y-3">
                      {selectedCoa.terpene_1_name && (
                        <div className="bg-cult-black border border-cult-medium-gray p-4 flex items-center justify-between">
                          <div>
                            <div className="text-sm text-cult-light-gray uppercase tracking-wider">
                              Primary Terpene
                            </div>
                            <div className="text-xl font-bold text-cult-white">{selectedCoa.terpene_1_name}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-cult-white">
                              {selectedCoa.terpene_1_percentage?.toFixed(3)}%
                            </div>
                            <div className="text-sm text-cult-lighter-gray">
                              {selectedCoa.terpene_1_value?.toFixed(2)} mg/g
                            </div>
                          </div>
                        </div>
                      )}
                      {selectedCoa.terpene_2_name && (
                        <div className="bg-cult-black border border-cult-medium-gray p-4 flex items-center justify-between">
                          <div>
                            <div className="text-sm text-cult-light-gray uppercase tracking-wider">
                              Secondary Terpene
                            </div>
                            <div className="text-xl font-bold text-cult-white">{selectedCoa.terpene_2_name}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-cult-white">
                              {selectedCoa.terpene_2_percentage?.toFixed(3)}%
                            </div>
                            <div className="text-sm text-cult-lighter-gray">
                              {selectedCoa.terpene_2_value?.toFixed(2)} mg/g
                            </div>
                          </div>
                        </div>
                      )}
                      {selectedCoa.terpene_3_name && (
                        <div className="bg-cult-black border border-cult-medium-gray p-4 flex items-center justify-between">
                          <div>
                            <div className="text-sm text-cult-light-gray uppercase tracking-wider">
                              Tertiary Terpene
                            </div>
                            <div className="text-xl font-bold text-cult-white">{selectedCoa.terpene_3_name}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-cult-white">
                              {selectedCoa.terpene_3_percentage?.toFixed(3)}%
                            </div>
                            <div className="text-sm text-cult-lighter-gray">
                              {selectedCoa.terpene_3_value?.toFixed(2)} mg/g
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {selectedCoa.pdf_file_path && (
                <div className="border-t-2 border-cult-medium-gray pt-6">
                  <a
                    href={getCOAPDFUrl(selectedCoa.pdf_file_path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-8 py-4 bg-cult-white text-cult-black text-center font-bold uppercase tracking-wider hover:bg-cult-off-white transition-all text-lg"
                  >
                    View Full Certificate (PDF)
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

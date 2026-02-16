/**
 * Coversheet Library - Public Page
 *
 * Publicly accessible page showing all active coversheets.
 * Provides search functionality and quick access to coversheet details.
 *
 * Features:
 * - Search by coversheet number or customer name
 * - Filter by date range
 * - Click to view full coversheet
 * - QR code accessible (no authentication required)
 * - Responsive grid/table layout
 *
 * Use Cases:
 * - Customers scanning QR codes from labels
 * - Quick lookup of delivery documentation
 * - Historical order verification
 * - Compliance audit access
 *
 * @route /coversheet-library
 */

import { useState, useEffect } from 'react';
import { Search, FileText, Calendar, Building2, Package, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getCoversheetPath } from '../../features/orders/services/coversheet.service';
import type { Coversheet } from '../../types';

export function CoversheetLibrary() {
  const [coversheets, setCoversheets] = useState<Coversheet[]>([]);
  const [filteredCoversheets, setFilteredCoversheets] = useState<Coversheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Load all active coversheets on mount
   */
  useEffect(() => {
    loadCoversheets();
  }, []);

  /**
   * Filter coversheets when search query changes
   */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCoversheets(coversheets);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = coversheets.filter((cs) =>
      cs.coversheet_number.toLowerCase().includes(query) ||
      cs.customer_name.toLowerCase().includes(query)
    );

    setFilteredCoversheets(filtered);
  }, [searchQuery, coversheets]);

  /**
   * Fetch all active coversheets from database
   */
  async function loadCoversheets() {
    try {
      const { data, error } = await supabase
        .from('coversheets')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setCoversheets(data || []);
      setFilteredCoversheets(data || []);
    } catch (err) {
      console.error('Failed to load coversheets:', err);
    } finally {
      setLoading(false);
    }
  }

  function getCoversheetUrl(coversheet: Coversheet): string {
    return getCoversheetPath(coversheet.access_token) + '&from=library';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cult-black flex items-center justify-center">
        <div className="text-cult-white text-xl uppercase tracking-wider">Loading Library...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cult-black">
      {/* Header */}
      <div className="bg-cult-near-black border-b-2 border-cult-medium-gray">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-5xl font-bold text-cult-white uppercase tracking-wider mb-3">
                Coversheet Library
              </h1>
              <p className="text-cult-lighter-gray text-lg">
                Browse delivery documentation and batch information
              </p>
            </div>
            <img
              src="/Cult Cannabis Co Final White 320x320@3x.png"
              alt="Cult Cannabis Co"
              className="h-24 w-auto"
            />
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cult-lighter-gray" />
            <input
              type="text"
              placeholder="Search by coversheet number or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-cult-black border-2 border-cult-medium-gray text-cult-white placeholder-cult-lighter-gray focus:outline-none focus:border-cult-white transition-colors text-lg"
            />
          </div>

          {/* Results Count */}
          <div className="mt-4 text-cult-lighter-gray">
            Showing {filteredCoversheets.length} of {coversheets.length} coversheets
          </div>
        </div>
      </div>

      {/* Coversheets Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {filteredCoversheets.length === 0 ? (
          <div className="bg-cult-near-black border-2 border-cult-medium-gray p-12 text-center">
            <FileText className="w-16 h-16 text-cult-lighter-gray mx-auto mb-4" />
            <h3 className="text-xl font-bold text-cult-white mb-2">
              {searchQuery ? 'No Results Found' : 'No Coversheets Available'}
            </h3>
            <p className="text-cult-lighter-gray">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Coversheets will appear here once generated'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCoversheets.map((coversheet) => (
              <a
                key={coversheet.id}
                href={getCoversheetUrl(coversheet)}
                className="bg-cult-near-black border-2 border-cult-medium-gray hover:border-cult-white transition-all p-6 group"
              >
                {/* Coversheet Number */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cult-white" />
                    <h3 className="text-lg font-bold text-cult-white font-mono">
                      {coversheet.coversheet_number}
                    </h3>
                  </div>
                  <ExternalLink className="w-4 h-4 text-cult-lighter-gray group-hover:text-cult-white transition-colors" />
                </div>

                {/* Customer */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-cult-lighter-gray" />
                    <span className="text-xs text-cult-lighter-gray uppercase tracking-wider">Customer</span>
                  </div>
                  <p className="text-cult-white font-semibold text-sm pl-6">
                    {coversheet.customer_name}
                  </p>
                </div>

                {/* Delivery Date */}
                {coversheet.delivery_date && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-cult-lighter-gray" />
                      <span className="text-xs text-cult-lighter-gray uppercase tracking-wider">Delivery</span>
                    </div>
                    <p className="text-cult-white text-sm pl-6">
                      {new Date(coversheet.delivery_date).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Package Count */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-cult-lighter-gray" />
                    <span className="text-xs text-cult-lighter-gray uppercase tracking-wider">Items</span>
                  </div>
                  <p className="text-cult-white font-bold text-sm pl-6">
                    {coversheet.total_packages} packages
                  </p>
                </div>

                {/* Footer Info */}
                <div className="pt-4 border-t border-cult-medium-gray">
                  <div className="flex items-center justify-between text-xs text-cult-lighter-gray">
                    <span>
                      Generated {new Date(coversheet.created_at).toLocaleDateString()}
                    </span>
                    {coversheet.accessed_count && coversheet.accessed_count > 0 && (
                      <span>
                        {coversheet.accessed_count} view{coversheet.accessed_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Outdated Warning */}
                {coversheet.is_outdated && (
                  <div className="mt-3 pt-3 border-t border-yellow-600">
                    <p className="text-xs text-yellow-500 font-semibold">
                      Outdated - Order Modified
                    </p>
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

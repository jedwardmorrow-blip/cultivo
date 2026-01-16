import { Search } from 'lucide-react';
import type { SearchResult } from '../types';

interface InventorySearchProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onSearch: () => void;
  onClear: () => void;
  searching: boolean;
  searchResults: SearchResult[];
}

export function InventorySearch({
  searchTerm,
  onSearchTermChange,
  onSearch,
  onClear,
  searching,
  searchResults,
}: InventorySearchProps) {
  return (
    <div className="bg-cult-near-black rounded-lg shadow border border-cult-medium-gray mb-6 p-4">
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder="Search by strain, batch, or package ID (e.g., 'Capulator Junky')"
            className="w-full px-4 py-3 pl-12 bg-cult-black text-cult-off-white border border-cult-charcoal rounded-lg focus:ring-2 focus:ring-cult-red/50 focus:border-cult-red transition-all duration-300"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cult-light-gray" />
          <button
            onClick={onSearch}
            disabled={searching}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-white text-cult-black hover:bg-cult-off-white transition-all font-medium uppercase tracking-wider text-sm disabled:opacity-50"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-3 p-4 bg-cult-black border border-cult-medium-gray rounded-lg max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-cult-white font-bold uppercase tracking-wider">
                Search Results ({searchResults.length})
              </h3>
              <button
                onClick={onClear}
                className="text-cult-light-gray hover:text-white text-sm"
              >
                Clear
              </button>
            </div>
            <div className="space-y-2">
              {searchResults.map((result, idx) => (
                <div key={idx} className="p-3 bg-cult-near-black border border-cult-medium-gray rounded hover:border-white transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-cult-white font-medium">{result.package_id}</span>
                        <span className="px-2 py-0.5 bg-cult-medium-gray text-cult-light-gray text-xs rounded uppercase">
                          {result.stage_display_name}
                        </span>
                        <span className="text-cult-light-gray text-xs">• {result.match_reason}</span>
                      </div>
                      <div className="text-sm text-cult-light-gray">
                        <span className="font-medium text-cult-white">{result.strain}</span>
                        {result.batch && <span> • Batch: {result.batch}</span>}
                        {result.room && <span> • Room: {result.room}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-cult-white font-bold">{result.weight_or_units.toFixed(1)} {result.unit}</div>
                      {result.status && <div className="text-xs text-cult-light-gray">{result.status}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

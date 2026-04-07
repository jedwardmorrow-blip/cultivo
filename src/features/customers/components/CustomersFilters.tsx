import { Search, Navigation, MapPin, AlertCircle } from 'lucide-react';

interface CustomersFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onGeocodeAll: () => void;
  isGeocodingAll: boolean;
  geocodedCount: number;
  missingGeocodeCount: number;
  totalCount: number;
}

export function CustomersFilters({
  searchTerm,
  onSearchChange,
  onGeocodeAll,
  isGeocodingAll,
  geocodedCount,
  missingGeocodeCount,
  totalCount,
}: CustomersFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="bg-cult-near-black rounded-lg border border-cult-medium-gray p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cult-light-gray" />
            <input
              type="text"
              placeholder="Search by name, code, license number..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white placeholder-cult-light-gray focus:outline-none focus:ring-2 focus:ring-cult-green focus:border-cult-green"
            />
          </div>

          {missingGeocodeCount > 0 && (
            <button
              onClick={onGeocodeAll}
              disabled={isGeocodingAll}
              className="flex items-center gap-2 px-6 py-3 bg-cult-info text-cult-text-primary rounded font-medium uppercase tracking-wider hover:bg-cult-info/80 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isGeocodingAll ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Geocoding...
                </>
              ) : (
                <>
                  <Navigation className="w-5 h-5" />
                  Geocode All ({missingGeocodeCount})
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-cult-near-black p-4 rounded-lg shadow border border-cult-medium-gray">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-cult-light-gray">Total Customers</p>
              <p className="text-2xl font-bold text-cult-white">{totalCount}</p>
            </div>
            <div className="w-12 h-12 bg-cult-medium-gray rounded-full flex items-center justify-center">
              <span className="text-2xl">🏢</span>
            </div>
          </div>
        </div>

        <div className="bg-cult-near-black p-4 rounded-lg shadow border border-cult-medium-gray">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-cult-light-gray">Geocoded</p>
              <p className="text-2xl font-bold text-cult-success">{geocodedCount}</p>
            </div>
            <MapPin className="w-8 h-8 text-cult-success" />
          </div>
        </div>

        <div className="bg-cult-near-black p-4 rounded-lg shadow border border-cult-medium-gray">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-cult-light-gray">Missing Geocode</p>
              <p className="text-2xl font-bold text-cult-warning">{missingGeocodeCount}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-cult-warning" />
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import {
  calculateRouteFromAPI,
  formatDistance,
  formatDuration,
  type Coordinate,
  type RouteResult
} from '../services/routing.service';
import { getFacilityCoordinates, getCustomersWithLocation } from '../services/delivery.service';
import { geocodeCustomerByAddress } from '../services/geocoding.service';
import { LeafletRouteMap } from './LeafletRouteMap';

interface Customer {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export function RouteTestingTool() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facilityCoords, setFacilityCoords] = useState<Coordinate>({ latitude: 33.417454, longitude: -111.994514 });

  useEffect(() => {
    loadFacilityCoords();
    loadCustomers();
  }, []);

  async function loadFacilityCoords() {
    try {
      const { data } = await getFacilityCoordinates();
      if (data && data.length === 2) {
        const latSetting = data.find(s => s.setting_key === 'facility_latitude');
        const lonSetting = data.find(s => s.setting_key === 'facility_longitude');

        if (latSetting?.setting_value && lonSetting?.setting_value) {
          setFacilityCoords({
            latitude: parseFloat(latSetting.setting_value),
            longitude: parseFloat(lonSetting.setting_value)
          });
        }
      }
    } catch (err) {
      console.error('Error loading facility coordinates:', err);
    }
  }

  async function loadCustomers() {
    try {
      const { data } = await getCustomersWithLocation();
      setCustomers(data || []);
    } catch (err) {
      console.error('Error loading customers:', err);
      setError('Failed to load customers');
    }
  }

  async function geocodeCustomer(customerId: string) {
    setGeocoding(true);
    setError(null);

    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer || !customer.address) {
        throw new Error('Customer address not found');
      }

      const coords = await geocodeCustomerByAddress(customerId, customer.address);
      await loadCustomers();
      setError(null);
      return coords;
    } catch (err: any) {
      const errorMsg = err.message || 'Geocoding failed';
      setError(errorMsg);

      await supabase
        .from('customers')
        .update({ geocoding_error: errorMsg })
        .eq('id', customerId);

      throw err;
    } finally {
      setGeocoding(false);
    }
  }

  async function testRoute() {
    if (!selectedCustomer) {
      setError('Please select a customer');
      return;
    }

    setLoading(true);
    setError(null);
    setRoute(null);

    try {
      let customer = customers.find(c => c.id === selectedCustomer);
      if (!customer) throw new Error('Customer not found');

      if (!customer.latitude || !customer.longitude) {
        const coords = await geocodeCustomer(selectedCustomer);
        customer = { ...customer, ...coords };
      }

      const routeResult = await calculateRouteFromAPI(
        facilityCoords,
        { latitude: customer.latitude!, longitude: customer.longitude! }
      );

      setRoute(routeResult);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate route');
    } finally {
      setLoading(false);
    }
  }

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);
  const hasCoords = selectedCustomerData?.latitude && selectedCustomerData?.longitude;

  return (
    <div className="space-y-6">
      <div className="bg-cult-near-black border border-cult-medium-gray p-6">
        <div className="flex items-center gap-3 mb-6">
          <Navigation className="w-6 h-6 text-cult-white" />
          <h2 className="text-2xl font-bold text-cult-white uppercase tracking-wide">
            Route Testing Tool
          </h2>
        </div>

        <div className="mb-6 p-4 bg-cult-black border border-cult-medium-gray/50">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-cult-white" />
            <span className="text-xs text-cult-light-gray uppercase tracking-wider">Facility Location (Origin)</span>
          </div>
          <p className="text-sm text-cult-white font-medium">3303 South 40th Street, Phoenix, AZ 85040</p>
          <p className="text-xs text-cult-lighter-gray mt-1">
            {facilityCoords.latitude.toFixed(6)}, {facilityCoords.longitude.toFixed(6)}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
              Select Customer
            </label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
            >
              <option value="">Choose a customer...</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.latitude && customer.longitude ? '✓' : '(needs geocoding)'}
                </option>
              ))}
            </select>
            {selectedCustomerData && (
              <p className="mt-2 text-xs text-cult-lighter-gray">
                {selectedCustomerData.address}
                {hasCoords && ` • ${selectedCustomerData.latitude?.toFixed(4)}, ${selectedCustomerData.longitude?.toFixed(4)}`}
              </p>
            )}
          </div>

          <button
            onClick={testRoute}
            disabled={loading || geocoding || !selectedCustomer}
            className="w-full px-6 py-3 bg-cult-white text-cult-black font-medium uppercase tracking-wider hover:bg-cult-off-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Calculating Route...' : geocoding ? 'Geocoding Address...' : 'Test Route'}
          </button>

          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-900/20 border border-red-700 text-red-100">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>

      {route && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-cult-near-black border border-cult-medium-gray p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-cult-white" />
                <span className="text-sm text-cult-light-gray uppercase tracking-wider">Distance</span>
              </div>
              <p className="text-2xl font-bold text-cult-white">
                {formatDistance(route.distance_meters)}
              </p>
            </div>

            <div className="bg-cult-near-black border border-cult-medium-gray p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-cult-white" />
                <span className="text-sm text-cult-light-gray uppercase tracking-wider">Duration</span>
              </div>
              <p className="text-2xl font-bold text-cult-white">
                {formatDuration(route.duration_seconds)}
              </p>
            </div>

            <div className="bg-cult-near-black border border-cult-medium-gray p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-cult-light-gray uppercase tracking-wider">Status</span>
              </div>
              <p className="text-2xl font-bold text-green-500">
                Success
              </p>
            </div>
          </div>

          {route.geometry && selectedCustomerData && (
            <div className="bg-cult-near-black border border-cult-medium-gray p-6">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="w-5 h-5 text-cult-white" />
                <h3 className="text-xl font-semibold text-cult-white uppercase tracking-wide">
                  Route Visualization
                </h3>
              </div>
              <div className="border border-cult-medium-gray overflow-hidden">
                <LeafletRouteMap
                  origin={facilityCoords}
                  destination={{
                    latitude: selectedCustomerData.latitude!,
                    longitude: selectedCustomerData.longitude!
                  }}
                  routeGeometry={route.geometry}
                  className="w-full h-96"
                />
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-cult-lighter-gray">
                <span>
                  Interactive map • Drag to pan • Scroll to zoom
                </span>
                <a
                  href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${facilityCoords.latitude},${facilityCoords.longitude};${selectedCustomerData?.latitude},${selectedCustomerData?.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cult-white hover:underline"
                >
                  Open in OpenStreetMap ↗
                </a>
              </div>
            </div>
          )}

          <div className="bg-cult-near-black border border-cult-medium-gray p-6">
            <div className="flex items-center gap-3 mb-4">
              <Navigation className="w-5 h-5 text-cult-white" />
              <h3 className="text-xl font-semibold text-cult-white uppercase tracking-wide">
                Turn-by-Turn Directions
              </h3>
              <span className="text-sm text-cult-light-gray">
                ({route.instructions.length} steps)
              </span>
            </div>
            {route.instructions.length > 0 ? (
              <div className="space-y-2">
                {route.instructions.map((instruction, index) => (
                  <div
                    key={index}
                    className="flex gap-4 p-3 bg-cult-black border border-cult-medium-gray/50 hover:border-cult-light-gray transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cult-white text-cult-black flex items-center justify-center text-sm font-bold">
                      {instruction.step_number}
                    </div>
                    <div className="flex-1">
                      <p className="text-cult-white text-sm leading-relaxed">{instruction.instruction_text}</p>
                      {instruction.street_name && (
                        <p className="text-xs text-cult-light-gray mt-1">
                          on {instruction.street_name}
                        </p>
                      )}
                      <p className="text-xs text-cult-lighter-gray mt-1">
                        {formatDistance(instruction.distance_meters)} • {formatDuration(instruction.duration_seconds)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-cult-lighter-gray mx-auto mb-3 opacity-50" />
                <p className="text-cult-light-gray">No turn-by-turn directions available</p>
                <p className="text-xs text-cult-lighter-gray mt-2">
                  The routing API returned a route but no detailed instructions
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

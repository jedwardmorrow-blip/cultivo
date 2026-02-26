export {
  getDeliverySchedules,
  updateDeliveryStatus,
  getEnrichedCalendarOrders,
  clearOrderDeliveryDate,
  getOrderItemsForCalendar
} from './delivery.service';

export type { CalendarOrder, CalendarOrderItem } from './delivery.service';

export {
  calculateRouteFromAPI,
  getCachedRoute,
  saveRouteToCache,
  getOrCalculateRoute,
  calculateMultiStopRoute,
  formatDistance,
  formatDuration,
  refreshStaleRoutes
} from './routing.service';

export type {
  Coordinate,
  RouteInstruction,
  RouteResult,
  CachedRoute
} from './routing.service';

export {
  geocodeAddress,
  updateCustomerGeocode,
  geocodeAllCustomers,
  getFacilityCoordinates,
  validateAddress,
  formatAddressForGeocoding,
  geocodeCustomerByAddress
} from './geocoding.service';

export type {
  Address,
  GeocodingResult
} from './geocoding.service';

export {
  getAllLocations,
  getLocationById
} from './locations.service';

export type {
  Location
} from './locations.service';

export {
  generateLeafletMapDataUrl
} from './leafletMap.service';

export type {
  LeafletMapOptions
} from './leafletMap.service';

export {
  generateStaticMapDataUrl,
  generateSimpleMapDataUrl
} from './staticMap.service';

export type {
  StaticMapOptions,
  MapBounds
} from './staticMap.service';

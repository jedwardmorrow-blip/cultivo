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

export {
  getDispatchQueue,
  sendDocument,
  computeDocStatus,
  hasOverdueDocs,
  getCustomerContacts,
  DEFAULT_LEAD_TIME_HOURS,
} from './dispatch.service';

export type {
  DispatchOrderRow,
  SendRecord,
  DocStatusPill,
  DocumentType,
} from './dispatch.service';

export {
  getActiveDrivers,
  getActiveVehicles,
  getTripPlans,
  getTripPlanById,
  createTripPlan,
  dispatchTripPlan,
  completeTripPlan,
} from './tripPlan.service';

export {
  generateTripPlanPDF,
  saveTripPlanPDF,
} from './tripPlanPDF.service';

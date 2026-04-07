import { Edit2, Trash2, Navigation, CheckCircle, AlertCircle } from 'lucide-react';
import type { Customer } from '../types';

interface CustomersListProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
  onGeocode: (id: string) => void;
  isGeocoding: boolean;
  geocodingCustomerId: string | null;
}

export function CustomersList({
  customers,
  onEdit,
  onDelete,
  onGeocode,
  isGeocoding,
  geocodingCustomerId,
}: CustomersListProps) {
  if (customers.length === 0) {
    return (
      <div className="bg-cult-near-black rounded-lg border border-cult-medium-gray p-12 text-center">
        <Building2 className="w-12 h-12 text-cult-light-gray mx-auto mb-3" />
        <p className="text-cult-light-gray">No customers found</p>
        <p className="text-cult-lighter-gray text-sm mt-1">Add your first customer to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-cult-near-black rounded-lg shadow border border-cult-medium-gray">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-cult-dark-gray border-b border-cult-medium-gray">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-light-gray uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-light-gray uppercase">Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-light-gray uppercase">License</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-light-gray uppercase">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-light-gray uppercase">Address</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-cult-light-gray uppercase">Geocoded</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-light-gray uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cult-medium-gray">
            {customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-cult-dark-gray transition">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-cult-white">{customer.name}</div>
                  {customer.license_name && customer.license_name !== customer.name && (
                    <div className="text-xs text-cult-light-gray mt-0.5">{customer.license_name}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-mono text-cult-white">{customer.dispensary_code}</span>
                </td>
                <td className="px-4 py-3">
                  {customer.license_number ? (
                    <div className="text-sm">
                      <div className="text-cult-white font-mono">{customer.license_number}</div>
                      {customer.ato_number && (
                        <div className="text-xs text-cult-light-gray mt-0.5">
                          ATO: {customer.ato_number}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-cult-lighter-gray text-xs">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {customer.contact_name || customer.email || customer.phone ? (
                    <div className="text-sm">
                      {customer.contact_name && (
                        <div className="text-cult-white">{customer.contact_name}</div>
                      )}
                      {customer.email && (
                        <div className="text-xs text-cult-light-gray">{customer.email}</div>
                      )}
                      {customer.phone && (
                        <div className="text-xs text-cult-light-gray">{customer.phone}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-cult-lighter-gray text-xs">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {customer.delivery_address || customer.address ? (
                    <div className="text-sm">
                      <div className="text-cult-white">
                        {customer.delivery_address || customer.address}
                      </div>
                      <div className="text-xs text-cult-light-gray">
                        {customer.delivery_city || customer.city}, {customer.delivery_state || customer.state}{' '}
                        {customer.delivery_postal_code || customer.postal_code}
                      </div>
                    </div>
                  ) : (
                    <span className="text-cult-lighter-gray text-xs">No address</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {customer.latitude && customer.longitude ? (
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-cult-success-muted text-cult-success rounded text-xs">
                      <CheckCircle className="w-3 h-3" />
                      Yes
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-cult-warning-muted text-cult-warning rounded text-xs">
                      <AlertCircle className="w-3 h-3" />
                      No
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {!customer.latitude && !customer.longitude && (customer.delivery_address || customer.address) && (
                      <button
                        onClick={() => onGeocode(customer.id)}
                        disabled={isGeocoding && geocodingCustomerId === customer.id}
                        className="text-cult-info hover:text-cult-info/80 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Geocode address"
                      >
                        {isGeocoding && geocodingCustomerId === customer.id ? (
                          <div className="w-4 h-4 border-2 border-cult-info border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Navigation className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(customer)}
                      className="text-cult-green hover:text-cult-green-bright"
                      title="Edit customer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(customer.id)}
                      className="text-cult-danger hover:text-cult-danger/80"
                      title="Delete customer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Building2({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

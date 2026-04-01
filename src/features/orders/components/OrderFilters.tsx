import { Search } from 'lucide-react';

interface OrderFiltersProps {
  searchTerm: string;
  filterStatus: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export function OrderFilters({
  searchTerm,
  filterStatus,
  onSearchChange,
  onStatusChange
}: OrderFiltersProps) {
  return (
    <div className="bg-cult-graphite border border-cult-charcoal rounded-cult p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cult-silver w-5 h-5" />
          <input
            type="text"
            placeholder="Search orders or customers..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-cult-black border border-cult-charcoal rounded-cult text-cult-off-white placeholder-cult-silver focus:outline-none focus:border-cult-danger focus:ring-2 focus:ring-cult-danger/50 transition-all duration-300"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-4 py-3 bg-cult-black border border-cult-charcoal rounded-cult text-cult-off-white focus:outline-none focus:border-cult-danger focus:ring-2 focus:ring-cult-danger/50 transition-all duration-300"
        >
          <option value="all">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="accepted">Accepted</option>
          <option value="processing">Processing</option>
          <option value="ready_for_delivery">Ready for Delivery</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </div>
  );
}

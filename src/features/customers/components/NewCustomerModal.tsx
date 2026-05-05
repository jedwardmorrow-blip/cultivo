interface NewCustomerModalProps {
  onClose: () => void;
  onSuccess?: (customerId: string) => void;
}

export function NewCustomerModal({ onClose }: NewCustomerModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-cult-surface border-2 border-cult-accent p-8 max-w-2xl w-full">
        <h2 className="text-2xl font-bold text-cult-text-primary mb-4">New Customer</h2>
        <p className="text-cult-text-muted mb-4">Customer creation form coming soon.</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-cult-accent text-cult-opaque-black hover:bg-cult-accent-hover transition-all font-medium uppercase tracking-wider text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}

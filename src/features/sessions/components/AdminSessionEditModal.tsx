interface AdminSessionEditModalProps {
  session: any;
  onClose: () => void;
  onUpdate: () => void;
}

export function AdminSessionEditModal({ session, onClose, onUpdate }: AdminSessionEditModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-cult-near-black border-2 border-cult-white p-8 max-w-2xl w-full">
        <h2 className="text-2xl font-bold text-cult-white mb-4">Edit Session</h2>
        <p className="text-cult-light-gray mb-4">Session editing form coming soon.</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-cult-white text-cult-black hover:bg-cult-light-gray transition-all font-medium uppercase tracking-wider text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}

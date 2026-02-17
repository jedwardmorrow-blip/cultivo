interface AdminSessionDeleteModalProps {
  sessionId: string;
  onClose: () => void;
  onDelete: () => void;
}

export function AdminSessionDeleteModal({ onClose, onDelete }: AdminSessionDeleteModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-cult-near-black border-2 border-red-600 p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Delete Session</h2>
        <p className="text-cult-light-gray mb-4">Are you sure you want to delete this session?</p>
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-cult-medium-gray text-cult-white hover:bg-cult-light-gray transition-all font-medium uppercase tracking-wider text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-all font-medium uppercase tracking-wider text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

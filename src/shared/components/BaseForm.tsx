import { ReactNode, FormEvent } from 'react';
import { Loader2 } from 'lucide-react';

interface BaseFormProps {
  children: ReactNode;
  onSubmit: () => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  isValid?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
}

export function BaseForm({
  children,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isValid = true,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
}: BaseFormProps) {
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isSubmitting && isValid) {
      await onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {children}

      <div className="flex justify-end gap-3 pt-6 border-t border-cult-medium-gray">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-2 border border-cult-medium-gray text-cult-white hover:bg-cult-medium-gray transition-all font-medium uppercase tracking-wider disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !isValid}
          className="px-6 py-2 bg-cult-white text-cult-black hover:bg-cult-off-white transition-all font-medium uppercase tracking-wider disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

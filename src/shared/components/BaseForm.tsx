import { ReactNode, FormEvent } from 'react';
import { Button } from './Button';

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
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {cancelLabel}
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting || !isValid}
          loading={isSubmitting}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

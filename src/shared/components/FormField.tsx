import { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  helpText?: string;
  error?: string;
  children: ReactNode;
}

export function FormField({ label, required, helpText, error, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-cult-white uppercase tracking-wider">
        {label}
        {required && <span className="text-cult-danger ml-1">*</span>}
      </label>
      {children}
      {helpText && !error && (
        <p className="text-xs text-cult-lighter-gray">{helpText}</p>
      )}
      {error && (
        <p className="text-xs text-cult-danger">{error}</p>
      )}
    </div>
  );
}

interface FormInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'password' | 'url';
  disabled?: boolean;
  maxLength?: number;
}

export function FormInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  maxLength,
}: FormInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      className="w-full bg-cult-surface-inset border border-cult-border text-cult-text-primary px-4 py-2 focus:outline-none focus:border-cult-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed placeholder-cult-text-muted"
    />
  );
}

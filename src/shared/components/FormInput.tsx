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
      className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-4 py-2 focus:outline-none focus:border-cult-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed placeholder-cult-lighter-gray"
    />
  );
}

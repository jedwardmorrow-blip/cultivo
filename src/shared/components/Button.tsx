import { forwardRef, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  uppercase?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-cult-white text-cult-black hover:bg-cult-off-white',
  secondary:
    'border border-cult-medium-gray text-cult-white hover:bg-cult-dark-gray hover:border-cult-green',
  success:
    'bg-cult-green text-cult-black hover:bg-cult-green-bright',
  danger:
    'bg-red-600 text-white hover:bg-red-700',
  ghost:
    'text-cult-silver hover:text-cult-white hover:bg-cult-charcoal',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'px-3 py-1.5 text-xs',
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3',
  lg: 'px-8 py-4 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      iconRight,
      loading = false,
      fullWidth = false,
      uppercase = true,
      disabled,
      className = '',
      children,
      ...rest
    },
    ref,
  ) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-medium tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    const classes = [
      base,
      variantClasses[variant],
      sizeClasses[size],
      uppercase ? 'uppercase' : '',
      fullWidth ? 'w-full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={classes}
        {...rest}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
        {children}
        {iconRight}
      </button>
    );
  },
);

Button.displayName = 'Button';

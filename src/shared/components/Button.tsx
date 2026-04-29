import { forwardRef, isValidElement, createElement, type ReactNode, type ButtonHTMLAttributes, type ElementType } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode | ElementType;
  iconRight?: ReactNode | ElementType;
  loading?: boolean;
  fullWidth?: boolean;
  uppercase?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-cult-accent text-cult-accent hover:bg-cult-accent hover:text-cult-opaque-black',
  secondary:
    'border border-cult-border text-cult-text-primary hover:border-cult-border-strong hover:bg-cult-surface-raised',
  success:
    'border border-cult-success text-cult-success hover:bg-cult-success hover:text-cult-opaque-black',
  danger:
    'border border-cult-danger text-cult-danger hover:bg-cult-danger hover:text-cult-opaque-black',
  ghost:
    'text-cult-text-muted hover:text-cult-text-primary hover:bg-cult-surface-subtle',
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
    const renderIcon = (value: ReactNode | ElementType | undefined) => {
      if (!value) return null;
      if (isValidElement(value)) return value;
      if (typeof value === 'function' || (typeof value === 'object' && '$$typeof' in value)) {
        return createElement(value as ElementType, { className: 'w-4 h-4' });
      }
      return value;
    };

    const base =
      'inline-flex items-center justify-center gap-2 font-mono tracking-[0.16em] rounded transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed';

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
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : renderIcon(icon)}
        {children}
        {renderIcon(iconRight)}
      </button>
    );
  },
);

Button.displayName = 'Button';

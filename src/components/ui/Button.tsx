import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = 'font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white';
  
  const variantStyles = {
    primary: 'button-gradient focus:ring-[#8B5CF6] focus:ring-offset-2',
    secondary: 'button-gradient focus:ring-[#06B6D4] focus:ring-offset-2',
    outline: 'border-2 border-[var(--border-subtle)] text-[var(--text-main)] hover:bg-[var(--bg-card-soft)] hover:border-[var(--border-strong)] focus:ring-slate-400 backdrop-blur-sm transition-all duration-300',
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};



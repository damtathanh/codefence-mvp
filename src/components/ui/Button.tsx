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
  const baseStyles = 'font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B0F28]';
  
  const variantStyles = {
    primary: 'button-gradient focus:ring-[#8B5CF6] focus:ring-offset-2',
    secondary: 'button-gradient focus:ring-[#06B6D4] focus:ring-offset-2',
    outline: 'border-2 border-white/10 text-white hover:bg-white/10 hover:border-white/20 focus:ring-white/50 backdrop-blur-sm transition-all duration-300',
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


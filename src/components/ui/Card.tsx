import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  glass = true,
}) => {
  return (
    <div
      className={`${glass ? 'bg-[var(--bg-card)] backdrop-blur-sm' : 'bg-[var(--bg-card-soft)]'} rounded-lg border border-[var(--border-subtle)] shadow-lg ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div className={`p-6 lg:p-8 pb-4 ${className}`}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <h3 className={`text-lg font-semibold text-[var(--text-main)] ${className}`}>
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <p className={`text-sm text-[var(--text-muted)] mt-1 ${className}`}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div className={`p-6 lg:p-8 pt-0 ${className}`}>
      {children}
    </div>
  );
};



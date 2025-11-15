import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  type,
  onKeyDown,
  ...props
}) => {
  // Handle invalid characters for number inputs
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If it's a number input, prevent invalid characters
    if (type === 'number') {
      // Prevent: 'e', 'E', '+', '-' (but allow backspace, delete, tab, escape, enter, arrow keys, and Ctrl/Cmd combinations)
      if (!e.ctrlKey && !e.metaKey && ['e', 'E', '+', '-'].includes(e.key)) {
        e.preventDefault();
        return; // Don't call custom handler if we prevented the event
      }
    }
    
    // Call custom onKeyDown handler if provided
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
          {label}
        </label>
      )}
      <input
        type={type}
        onKeyDown={handleKeyDown}
        className={`w-full px-4 py-3.5 bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]/50 focus:bg-[var(--bg-card-soft)] transition-all duration-300 ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
};


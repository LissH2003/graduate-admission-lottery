// 按钮组件 - Button/Primary 和 Button/Danger（带状态）
import React from 'react';

export type ButtonVariant = 'primary' | 'danger' | 'secondary';
export type ButtonState = 'default' | 'hover' | 'loading' | 'disabled';

interface LotteryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function LotteryButton({
  variant = 'primary',
  isLoading = false,
  children,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}: LotteryButtonProps) {
  const baseStyles = 'h-12 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2';
  
  const variantStyles = {
    primary: 'bg-gradient-to-r from-[#1E40AF] to-[#3B82F6] text-white hover:from-[#1E3A8A] hover:to-[#2563EB] active:scale-95',
    danger: 'bg-[#DC2626] text-white hover:bg-[#B91C1C] active:scale-95',
    secondary: 'bg-gray-200 text-[#111827] hover:bg-gray-300 active:scale-95',
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledStyles = (disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${widthClass} ${disabledStyles} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
}

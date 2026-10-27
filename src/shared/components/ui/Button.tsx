'use client';

import { useRef, useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  children, 
  disabled, 
  ...props 
}: ButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';
  
  const variants = {
    primary: 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 focus:ring-indigo-500 shadow-md hover:shadow-lg hover:shadow-indigo-500/25',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 focus:ring-red-500 shadow-md hover:shadow-lg hover:shadow-red-500/25',
    ghost: 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
    outline: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800',
    success: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 focus:ring-green-500 shadow-md',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 focus:ring-amber-500 shadow-md',
  };
  
  const sizes = { 
    sm: 'px-3 py-1.5 text-xs gap-1.5', 
    md: 'px-4 py-2 text-sm gap-2', 
    lg: 'px-6 py-3 text-base gap-2' 
  };

  return (
    <button 
      ref={buttonRef}
      className={cn(baseStyles, variants[variant], sizes[size], className)} 
      disabled={disabled || isLoading} 
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      style={{ transform: isPressed ? 'scale(0.98)' : 'scale(1)' }}
      {...props}
    >
      {isLoading && (
        <Loader2 className="w-4 h-4 animate-spin" />
      )}
      {children}
    </button>
  );
}

export default Button;
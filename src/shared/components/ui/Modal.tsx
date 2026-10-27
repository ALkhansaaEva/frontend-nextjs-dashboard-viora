'use client';

import { ReactNode, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw] max-h-[90vh]',
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      <div className={cn(
        'flex max-h-[94dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:max-h-[90vh] sm:rounded-xl dark:bg-gray-800',
        'transform transition-all duration-200',
        sizes[size]
      )}>
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-gray-200 p-3 sm:p-4 dark:border-gray-700">
            <h2 id={titleId} className="min-w-0 truncate text-base font-semibold text-gray-900 sm:text-lg dark:text-white">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className={cn(
          'min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4',
          size === 'full' ? 'sm:max-h-[calc(90vh-80px)]' : 'sm:max-h-[calc(90vh-120px)]'
        )}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;

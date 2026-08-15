'use client';

import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore } from '@/store/toast.store';
import { cn } from '@/shared/lib/utils';

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info } as const;
const STYLES = {
  success: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300',
  error: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  info: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
} as const;

/** Mounted once at the app root (src/app/providers.tsx). */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((t) => {
        const Icon = ICONS[t.variant];
        return (
          <div key={t.id} className={cn('flex items-start gap-2 rounded-xl border p-3 shadow-lg backdrop-blur-sm', STYLES[t.variant])}>
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{t.message}</p>
              {t.detail && <p className="text-xs opacity-80 mt-0.5 break-words">{t.detail}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default Toaster;

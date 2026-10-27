'use client';

import { Coins } from 'lucide-react';
import { useCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { formatIntegerString } from '@/shared/lib/money';
import { cn } from '@/shared/lib/utils';

interface GameCurrencyDisplayProps {
  /** Amount as returned by the backend — numeric(30,0) string, or `undefined`
   * for "no data" (renders N/A, never a fake 0). */
  amount: string | undefined;
  /** Show the configured symbol/short name next to the amount, when set. */
  showSymbol?: boolean;
  className?: string;
}

/**
 * Central money display — the ONE place that turns a raw GAME_CURRENCY
 * string into what an operator sees. Internal requests still always use the
 * canonical `GAME_CURRENCY` key; this only affects the customer-facing label
 * (backend `admin/currency-display`) and never the amount's precision.
 */
export function GameCurrencyDisplay({ amount, showSymbol = false, className }: GameCurrencyDisplayProps) {
  const { data: config } = useCurrencyDisplay();
  const iconIsUrl = config?.iconAssetRef && /^https?:\/\//.test(config.iconAssetRef);

  return (
    <span className={cn('inline-flex items-center gap-1.5 font-mono font-semibold tabular-nums', className)}>
      {iconIsUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary backend-configured asset URL
        <img src={config.iconAssetRef!} alt="" className="w-4 h-4 shrink-0" />
      ) : (
        <Coins className="w-4 h-4 text-emerald-500 shrink-0" />
      )}
      {formatIntegerString(amount)}
      {showSymbol && config?.symbol && <span className="text-gray-400 font-normal">{config.symbol}</span>}
    </span>
  );
}

export default GameCurrencyDisplay;

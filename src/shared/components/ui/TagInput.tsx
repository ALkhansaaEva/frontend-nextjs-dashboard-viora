'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

/**
 * Chip/token input — structured multi-value entry without inventing a
 * catalog. Used where the backend contract is a free string[] (e.g.
 * campaign eligibleRegions ISO2 codes).
 */
interface TagInputProps {
  label?: string;
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  /** Normalize tokens on add (e.g. uppercase ISO codes). */
  normalize?: (token: string) => string;
  disabled?: boolean;
}

export function TagInput({
  label,
  value,
  onChange,
  placeholder,
  normalize,
  disabled,
}: TagInputProps) {
  const [draft, setDraft] = useState('');

  const addToken = (raw: string) => {
    const token = (normalize ? normalize(raw) : raw).trim();
    if (!token) return;
    if (!value.includes(token)) onChange([...value, token]);
    setDraft('');
  };

  return (
    <div>
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2 py-1.5 dark:border-gray-600 dark:bg-gray-800">
        {value.map((token) => (
          <span
            key={token}
            className="flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
          >
            {token}
            {!disabled && (
              <button
                type="button"
                aria-label={`Remove ${token}`}
                onClick={() => onChange(value.filter((v) => v !== token))}
                className="text-indigo-400 hover:text-indigo-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        <input
          className="min-w-[120px] flex-1 border-none bg-transparent text-sm focus:outline-none dark:text-gray-100"
          value={draft}
          disabled={disabled}
          placeholder={value.length === 0 ? placeholder : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addToken(draft);
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => draft.trim() && addToken(draft)}
        />
      </div>
    </div>
  );
}

export default TagInput;

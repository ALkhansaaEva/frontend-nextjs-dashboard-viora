'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useUserIdentity } from '@/hooks/useUserIdentity';

/** Copyable, truncated technical ID — secondary, never the primary label. */
export function CopyId({ id, label }: { id: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(id).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200); }); }}
      className="inline-flex items-center gap-1 text-[10px] font-mono text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      title={id}
    >
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      {label ? `${label}: ` : ''}{id.slice(0, 8)}…
    </button>
  );
}

/**
 * Resolves a bare `userId` UUID to a human identity (nickname/email) via
 * GET /admin/users/:id, falling back to the raw ID if resolution fails or
 * is still loading — a table cell must never render blank while waiting.
 */
export function UserIdentityCell({ userId }: { userId: string }) {
  const { data, isLoading } = useUserIdentity(userId);

  if (isLoading) {
    return <span className="text-xs text-gray-400 animate-pulse">Loading…</span>;
  }
  if (!data) {
    return (
      <div>
        <p className="text-sm text-gray-400 italic">Unresolved user</p>
        <CopyId id={userId} />
      </div>
    );
  }
  return (
    <div>
      <p className="font-medium text-sm">{data.nickname || '—'}</p>
      {data.email && <p className="text-xs text-gray-400">{data.email}</p>}
      <CopyId id={userId} />
    </div>
  );
}

export default UserIdentityCell;
